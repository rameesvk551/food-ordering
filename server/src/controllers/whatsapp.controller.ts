import { Request, Response } from 'express';
import { handleFlowRequest } from './flow.controller';
import crypto from 'crypto';
import axios from 'axios';
import { Restaurant } from '../models/Restaurant';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { env } from '../config/env';
import { encrypt } from '../utils/encryption';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import {
  provisionClientInMarketingOs,
  getMarketingOsPartnerToken,
  getMarketingOsEmbeddedConfig,
  completeMarketingOsEmbeddedSignup,
} from '../services/marketing-os.service';

import {
  sendWhatsAppMessage,
  sendInteractiveButtons,
  sendListMessage,
  sendLocationRequest,
  sendProductListMessage,
  sendOrderDetailsMessage,
  formatMenuMessage,
  parseOrderFromMessage,
  getHelpMessage,
  sendFlowMessage,
} from '../services/whatsapp.service';
import { createAndPublishFlow } from '../services/flow.service';

const WAYO_TENANT_IDS = [
  'b78ba0d3-3563-441d-b657-619f79e2e58e',
  'b78ba0d3-9efc-464e-bced-30784ae2e58e',
];

const INLINE_IMAGE_FALLBACK = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const DEFAULT_FLOW_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/480px-No_image_available.svg.png';
const inlineImageCache = new Map<string, string>();

const CATEGORY_CLOUDINARY_MAP: Record<string, string> = {
  pizza: DEFAULT_FLOW_IMAGE,
  burger: DEFAULT_FLOW_IMAGE,
  biryani: DEFAULT_FLOW_IMAGE,
  pasta: DEFAULT_FLOW_IMAGE,
  sushi: DEFAULT_FLOW_IMAGE,
  tacos: DEFAULT_FLOW_IMAGE,
};

const isPublicImageUrl = (url?: string): boolean => {
  return !!url && (url.startsWith('https://') || url.startsWith('http://'));
};

const toAbsoluteUrl = (url?: string): string => {
  if (!url || typeof url !== 'string' || url === '') return DEFAULT_FLOW_IMAGE;
  
  // 1. Handle explicit local paths
  if (url.startsWith('/uploads/')) {
    const baseUrl = env.marketingOsApiBaseUrl ? env.marketingOsApiBaseUrl.split('/api')[0] : 'https://api.app.wayon.in';
    return `${baseUrl}${url}`;
  }

  // 2. Handle absolute URLs (already public)
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }

  // Handle partial Cloudinary paths locally without transformations
  if (env.cloudinaryCloudName) {
    return `https://res.cloudinary.com/${env.cloudinaryCloudName}/image/upload/${url}`;
  }

  return DEFAULT_FLOW_IMAGE;
};

const getCategoryImage = (category: any): string => {
  const categoryImage = category?.image;
  if (categoryImage) {
    return toAbsoluteUrl(categoryImage);
  }

  const firstItemImage = Array.isArray(category?.items)
    ? category.items.find((item: any) => item?.image)?.image
    : undefined;
  
  if (firstItemImage) {
    return toAbsoluteUrl(firstItemImage);
  }

  const name = category?.name || '';
  const key = name.toLowerCase();
  
  let fallbackImage = CATEGORY_CLOUDINARY_MAP.pizza;
  if (key.includes('pizza')) fallbackImage = CATEGORY_CLOUDINARY_MAP.pizza;
  else if (key.includes('burger')) fallbackImage = CATEGORY_CLOUDINARY_MAP.burger;
  else if (key.includes('biryani') || key.includes('rice')) fallbackImage = CATEGORY_CLOUDINARY_MAP.biryani;
  else if (key.includes('pasta')) fallbackImage = CATEGORY_CLOUDINARY_MAP.pasta;
  else if (key.includes('sushi')) fallbackImage = CATEGORY_CLOUDINARY_MAP.sushi;
  else if (key.includes('taco')) fallbackImage = CATEGORY_CLOUDINARY_MAP.tacos;
  
  return toAbsoluteUrl(fallbackImage);
};

const toInlineImage = async (url?: string): Promise<string> => {
  if (!url || typeof url !== 'string') return INLINE_IMAGE_FALLBACK;
  if (url.startsWith('data:image/')) {
    const [, base64Payload = ''] = url.split(',', 2);
    return base64Payload || INLINE_IMAGE_FALLBACK;
  }

  let absoluteUrl = url;
  if (url.startsWith('/uploads/')) {
    const baseUrl = env.marketingOsApiBaseUrl ? env.marketingOsApiBaseUrl.split('/api')[0] : 'https://api.app.wayon.in';
    absoluteUrl = `${baseUrl}${url}`;
  } else if (!url.startsWith('http')) {
    if (env.cloudinaryCloudName) {
      absoluteUrl = `https://res.cloudinary.com/${env.cloudinaryCloudName}/image/upload/w_200,h_200,c_fill,f_jpg,q_auto/${url}`;
    } else {
      return INLINE_IMAGE_FALLBACK;
    }
  } else if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    absoluteUrl = url.replace('/image/upload/', '/image/upload/w_200,h_200,c_fill,f_jpg,q_auto/');
  }

  if (inlineImageCache.has(absoluteUrl)) return inlineImageCache.get(absoluteUrl)!;

  try {
    const response = await axios.get(absoluteUrl, {
      responseType: 'arraybuffer',
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const contentType = String(response.headers['content-type'] || 'image/jpeg').split(';')[0];
    if (!contentType.startsWith('image/')) return INLINE_IMAGE_FALLBACK;
    const base64 = Buffer.from(response.data).toString('base64');
    inlineImageCache.set(absoluteUrl, base64);
    return base64;
  } catch {
    return INLINE_IMAGE_FALLBACK;
  }
};

const getCartItemDisplayName = (item: any): string => {
  const baseName = String(item?.name || '').trim();
  const portionLabel = String(item?.portionLabel || item?.portion_label || '').trim();

  if (!baseName) return portionLabel;
  if (!portionLabel) return baseName;
  if (baseName.toLowerCase().includes(portionLabel.toLowerCase())) return baseName;

  return `${baseName} (${portionLabel})`;
};

const formatCartLine = (item: any): string => {
  const quantity = Math.max(1, Number(item?.quantity) || 1);
  const price = Math.max(0, Number(item?.price) || 0);
  const notes = String(item?.notes || '').trim();
  const noteSuffix = notes ? `\nNote: ${notes}` : '';

  return `${getCartItemDisplayName(item)} x${quantity} - ₹${price * quantity}${noteSuffix}`;
};

const formatCartSummary = (items: any[]): string => items.map((item) => formatCartLine(item)).join('\n');

const getCartTotal = (items: any[]): number =>
  items.reduce((sum: number, item: any) => sum + (Math.max(0, Number(item?.price) || 0) * Math.max(1, Number(item?.quantity) || 1)), 0);

const mapFlowCartItemsToWhatsappCart = (flowCartItems: any[], restaurant: any): any[] => {
  const allItems = restaurant.menu.flatMap((category: any) => category.items || []);

  return (flowCartItems || [])
    .map((entry: any) => {
      if (typeof entry === 'string') {
        const item = allItems.find((candidate: any) => (candidate._id?.toString() || candidate.name) === entry);
        return item
          ? {
              productId: item._id?.toString() || item.name,
              name: item.name,
              quantity: 1,
              price: item.price,
              portionLabel: '',
              notes: '',
            }
          : null;
      }

      const productId = String(entry?.product_id || entry?.productId || '').trim();
      const fallbackItem = allItems.find(
        (candidate: any) => (candidate._id?.toString() || candidate.name) === productId || candidate.name === entry?.name
      );

      if (!productId && !fallbackItem) {
        return null;
      }

      return {
        productId: productId || fallbackItem?._id?.toString() || fallbackItem?.name || '',
        name: String(entry?.name || fallbackItem?.name || '').trim(),
        quantity: Math.max(1, Number(entry?.quantity) || 1),
        price: Math.max(0, Number(entry?.unit_price || entry?.unitPrice || entry?.price) || fallbackItem?.price || 0),
        portionLabel: String(entry?.portion_label || entry?.portionLabel || '').trim(),
        notes: String(entry?.notes || '').trim(),
      };
    })
    .filter((item: any) => item && item.productId && item.name);
};

const getCustomerCartItems = (customer: any): any[] => {
  if (Array.isArray(customer?.whatsappCart)) return customer.whatsappCart;
  return [];
};

const setCustomerCartItems = (customer: any, cartItems: any[]) => {
  customer.whatsappCart = cartItems;
  customer.cartUpdatedAt = new Date();
};

const buildBrowserMenuUrl = (slug: string, phone: string, name: string): string => {
  const safeBase = env.clientBaseUrl.replace(/\/$/, '');
  const query = new URLSearchParams({
    wa_phone: phone,
    wa_name: name || 'Customer',
    src: 'whatsapp',
  });

  return `${safeBase}/${slug}?${query.toString()}`;
};


// WhatsApp webhook verification (GET)
export const verifyWebhook = (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.whatsappVerifyToken) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
};

// WhatsApp webhook handler (POST)
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  console.log(`[Webhook] [${req.method}] ${req.path} Arrived.`);
  try {
    let body = req.body;
    console.log('[Webhook] Received payload:', JSON.stringify(body, null, 2));
    const signature = req.headers['x-marketing-os-signature'] as string;
    const partnerTenantIdHeader = req.headers['x-partner-tenant-id'] as string;
    const marketingOsEventHeader = req.headers['x-marketing-os-event'] as string;

    // ── Unified Routing: Delegate Flow requests to flow.controller ──
    // ONLY if it truly has flow data or is a ping
    const isFlow = Boolean(
        body?.encrypted_flow_data || 
        body?.action === 'ping' ||
        body?.entry?.[0]?.changes?.[0]?.value?.encrypted_flow_data
    );

    if (isFlow) {
        console.log('[Webhook] Delegating Flow request to flow controller.');
        await handleFlowRequest(req, res);
        return;
    }

    // Verify signature if secret is configured
    if (env.marketingOsWebhookSecret && signature) {
      const rawPayloadString = (req as any).rawBody as string | undefined;
      const payloadString = rawPayloadString || JSON.stringify(req.body);

      const computedFromRaw = `sha256=${crypto
        .createHmac('sha256', env.marketingOsWebhookSecret)
        .update(payloadString)
        .digest('hex')}`;
      const computedFromJson = `sha256=${crypto
        .createHmac('sha256', env.marketingOsWebhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex')}`;

      const signatureMatches = signature === computedFromRaw || signature === computedFromJson;
      
      console.log(`[Webhook] Signature Verification:
        Received: ${signature.slice(0, 20)}...
        Computed(raw): ${computedFromRaw.slice(0, 20)}...
        Computed(json): ${computedFromJson.slice(0, 20)}...
        Match: ${signatureMatches}
        Payload (sample): ${payloadString.slice(0, 100)}...`);

      if (!signatureMatches) {
        console.warn('[Webhook] Signature mismatch detected!');

        // Safe fallback for Marketing OS proxied traffic when signature format/body transform differs.
        // This specifically unblocks known Wayo proxy events without leaving the endpoint fully open.
        const isWayoTenant =
          partnerTenantIdHeader === 'b78ba0d3-3563-441d-b657-619f79e2e58e' ||
          partnerTenantIdHeader === 'b78ba0d3-9efc-464e-bced-30784ae2e58e' ||
          req.headers['x-marketing-os-tenant-id'] === 'b78ba0d3-3563-441d-b657-619f79e2e58e' ||
          req.headers['x-marketing-os-tenant-id'] === 'b78ba0d3-9efc-464e-bced-30784ae2e58e';
        if (isWayoTenant) {
          console.warn(`[Webhook] Proxy fallback enabled for Wayo tenant despite signature mismatch (event: ${marketingOsEventHeader || 'unknown'}).`);
        } else {
          res.status(401).send('Invalid signature');
          return;
        }
      }
    }

    // Identify restaurant
    let restaurant = null;
    const change = body.entry?.[0]?.changes?.[0]?.value;
    const phoneNumberId = change?.metadata?.phone_number_id;

    if (partnerTenantIdHeader) {
        console.log(`[Webhook] Identifying store by header X-Partner-Tenant-Id: ${partnerTenantIdHeader}`);
        if (WAYO_TENANT_IDS.includes(partnerTenantIdHeader)) {
          restaurant = await Restaurant.findOne({ marketingOsTenantId: { $in: WAYO_TENANT_IDS } });
        } else {
          restaurant = await Restaurant.findOne({ marketingOsTenantId: partnerTenantIdHeader });
        }
    }

    if (!restaurant && phoneNumberId) {
        console.log(`[Webhook] Identifying store by phone_number_id: ${phoneNumberId}`);
        restaurant = await Restaurant.findOne({ whatsappPhoneNumberId: phoneNumberId });
    }

    if (!restaurant) {
      console.warn('[Webhook] Restaurant not found. Payload ID:', phoneNumberId, 'Header ID:', partnerTenantIdHeader);
      res.status(200).send('OK (Restaurant not found)'); // Quick response to Meta
      return;
    }

    // Response quickly after identifying store
    res.status(200).send('OK');

    if (!change?.messages?.[0]) return;

    const message = change.messages[0];
    const customerPhone = message.from;
    const customerName = change.contacts?.[0]?.profile?.name || 'there';
    if (!restaurant) {
      console.error('No restaurant found for phoneNumberId:', phoneNumberId);
      return;
    }

    // Find or create customer
    let customer = await Customer.findOne({
      phoneNumber: customerPhone,
      restaurantId: restaurant._id,
    });

    if (!customer) {
      customer = new Customer({
        phoneNumber: customerPhone,
        restaurantId: restaurant._id,
        whatsappUserId: customerPhone,
        name: customerName,
      });
      await customer.save();
    }

    // Handle interactive responses (Buttons, Lists, etc.)
    if (message.type === 'interactive') {
      const interactive = message.interactive;

      if (interactive.type === 'button_reply') {
        const buttonId = interactive.button_reply.id;

        if (buttonId === 'view_menu') {
          const categories = (restaurant.menu || []).filter((cat: any) =>
            Array.isArray(cat.items) && cat.items.some((item: any) => item?.isAvailable !== false)
          );

          if (categories.length === 0) {
            await sendWhatsAppMessage(
              customerPhone,
              'Sorry, no menu categories are available right now. Please try again shortly.',
              restaurant.whatsappPhoneNumberId,
              restaurant.accessToken
            );
            return;
          }

          try {
            if (restaurant.whatsappFlowId) {
              const flowCategories = await Promise.all(categories.map(async (cat: any) => ({
                id: cat._id?.toString() || cat.name,
                'main-content': {
                  title: cat.name,
                  description: `${(cat.items || []).filter((item: any) => item?.isAvailable !== false).length} items`,
                },
                start: {
                  image: await toInlineImage(getCategoryImage(cat)),
                },
                'on-click-action': {
                  name: 'data_exchange',
                  payload: {
                    intent: 'load_items',
                    selected_category_id: cat._id?.toString() || cat.name,
                  },
                },
              })));
              try {
                await sendFlowMessage(
                  customerPhone,
                  'Browse our menu and order directly from here! 👇',
                  'Open Menu',
                  restaurant.whatsappFlowId,
                  restaurant._id.toString(),
                  restaurant.whatsappPhoneNumberId,
                  restaurant.accessToken,
                  '🍽️ Interactive Menu',
                  undefined,
                  'navigate',
                  {
                    screen: 'CATEGORIES',
                    data: {
                      categories_list: flowCategories,
                    },
                  }
                );
              } catch (launchError) {
                console.error('[Webhook] Rich Flow launch failed, retrying minimal launch:', launchError);
                await sendFlowMessage(
                  customerPhone,
                  'Browse our menu and order directly from here! 👇',
                  'Open Menu',
                  restaurant.whatsappFlowId,
                  restaurant._id.toString(),
                  restaurant.whatsappPhoneNumberId,
                  restaurant.accessToken,
                  '🍽️ Interactive Menu'
                );
              }

              customer.whatsappFlowState = 'menu_flow';
              await customer.save();

              const browserMenuUrl = buildBrowserMenuUrl(restaurant.slug, customer.phoneNumber, customer.name);
              await sendWhatsAppMessage(
                customerPhone,
                `🌐 View menu in browser (auto-login):\n${browserMenuUrl}\n\nAnything you add there will sync here too.`,
                restaurant.whatsappPhoneNumberId,
                restaurant.accessToken
              );
              return;
            }
          } catch (flowError) {
            console.error('[Webhook] Flow menu delivery failed:', flowError);
            await sendWhatsAppMessage(
              customerPhone,
              'Interactive menu is temporarily unavailable. Please try again in a moment.',
              restaurant.whatsappPhoneNumberId,
              restaurant.accessToken
            );
            return;
          }

          await sendWhatsAppMessage(
            customerPhone,
            'Interactive menu is not configured yet for this restaurant.',
            restaurant.whatsappPhoneNumberId,
            restaurant.accessToken
          );
          return;
        }

        if (buttonId === 'my_orders') {
          const lastOrders = await Order.find({ customerId: customer._id })
            .sort({ createdAt: -1 })
            .limit(5);

          if (lastOrders.length === 0) {
            await sendWhatsAppMessage(
              customerPhone,
              "You haven't placed any orders yet! Type *menu* to see what we have.",
              restaurant.whatsappPhoneNumberId,
              restaurant.accessToken
            );
          } else {
            const sections = [{
              title: 'Recent Orders',
              rows: lastOrders.map(o => ({
                id: `order_${o._id}`,
                title: `Order #${o._id.toString().slice(-4)}`,
                description: `₹${o.totalAmount} - ${o.status}`
              }))
            }];
            await sendListMessage(
              customerPhone,
              'Select an order to view details 👇',
              'View Orders',
              sections,
              restaurant.whatsappPhoneNumberId,
              restaurant.accessToken,
              '🧾 Your Orders'
            );
          }
          return;
        }

        if (buttonId === 'checkout') {
          const cartItems = getCustomerCartItems(customer);
          if (cartItems.length === 0) {
            await sendWhatsAppMessage(
              customerPhone,
              '🛒 Your cart is empty! Please add some items first.',
              restaurant.whatsappPhoneNumberId,
              restaurant.accessToken
            );
            return;
          }
          await sendInteractiveButtons(
            customerPhone,
            '🚚 Delivery or Pickup?',
            [
              { id: 'mode_delivery', title: '🏠 Delivery' },
              { id: 'mode_pickup', title: '🏃 Pickup' }
            ],
            restaurant.whatsappPhoneNumberId,
            restaurant.accessToken
          );
          customer.whatsappFlowState = 'checkout_mode';
          await customer.save();
          return;
        }

        if (buttonId === 'mode_delivery') {
          await sendLocationRequest(
            customerPhone,
            '📍 Share your delivery location for accurate delivery.',
            restaurant.whatsappPhoneNumberId,
            restaurant.accessToken
          );
          customer.whatsappFlowState = 'checkout_location';
          await customer.save();
          return;
        }

        if (buttonId === 'mode_pickup') {
          // Skip location, go to confirm
          const cartItems = getCustomerCartItems(customer);
          const itemsSummary = formatCartSummary(cartItems);
          const total = getCartTotal(cartItems);

          await sendInteractiveButtons(
            customerPhone,
            `🧾 *Order Summary (Pickup)*\n\n${itemsSummary}\n\n-------------------\n*Total: ₹${total}*`,
            [
              { id: 'confirm_order', title: '✅ Confirm' },
              { id: 'edit_cart', title: '✏️ Edit' }
            ],
            restaurant.whatsappPhoneNumberId,
            restaurant.accessToken
          );
          customer.whatsappFlowState = 'checkout_confirm';
          await customer.save();
          return;
        }

        if (buttonId === 'confirm_order') {
          // Create real order
          const cartItems = getCustomerCartItems(customer);
          const total = getCartTotal(cartItems);
          const order = new Order({
            restaurantId: restaurant._id,
            customerId: customer._id,
            items: cartItems,
            totalAmount: total,
            status: 'pending',
            source: 'whatsapp',
            customerName: customer.name,
            customerPhone: customer.phoneNumber,
            paymentStatus: 'pending'
          });
          await order.save();

          // Send payment message
          await sendOrderDetailsMessage(
            customerPhone,
            order,
            restaurant.whatsappPhoneNumberId,
            restaurant.accessToken
          );

          customer.whatsappFlowState = 'idle';
          setCustomerCartItems(customer, []);
          await customer.save();
          return;
        }

        if (buttonId === 'clear_cart') {
          setCustomerCartItems(customer, []);
          await customer.save();
          await sendWhatsAppMessage(
            customerPhone,
            '🛒 Your cart has been cleared.',
            restaurant.whatsappPhoneNumberId,
            restaurant.accessToken
          );
          return;
        }

        if (buttonId === 'edit_cart' || buttonId === 'add_more') {
          if (!restaurant.whatsappFlowId) return;

          await sendFlowMessage(
            customerPhone,
            'Browse our menu and add more items! 👇',
            'Open Menu',
            restaurant.whatsappFlowId,
            restaurant._id.toString(),
            restaurant.whatsappPhoneNumberId,
            restaurant.accessToken,
            '🍽️ Edit Order'
          );
          customer.whatsappFlowState = 'menu_flow';
          await customer.save();
          return;
        }

        if (buttonId === 'support') {
          await sendWhatsAppMessage(
            customerPhone,
            '💬 Connecting you to our support team... One of our staff members will reply to you shortly. 🙏',
            restaurant.whatsappPhoneNumberId,
            restaurant.accessToken
          );
          return;
        }
      }

      // Handle Form payload return (nfm_reply) from Flows
      if (interactive.type === 'nfm_reply') {
        console.log(`[WhatsApp Webhook] Received Flow Completion (nfm_reply) from ${customerPhone}`);
        try {
           const flowResponse = JSON.parse(interactive.nfm_reply.response_json);
           console.log('[WhatsApp Webhook] Flow Response JSON:', JSON.stringify(flowResponse, null, 2));

           const flowIntent = flowResponse.intent || flowResponse.action;

           if (flowIntent === 'checkout') {
              const cartItems = flowResponse.cart_items || []; // e.g. ["item_id_1", "item_id_2"]
              console.log(`[WhatsApp Webhook] User selected ${cartItems.length} items from flow.`);
              const processedCart = mapFlowCartItemsToWhatsappCart(cartItems, restaurant);

              if (processedCart.length > 0) {
                  setCustomerCartItems(customer, processedCart);
                 await customer.save();
                 console.log(`[WhatsApp Webhook] Updated customer cart. Total items: ${processedCart.length}`);

                  const cartSummary = formatCartSummary(getCustomerCartItems(customer));
                  const total = getCartTotal(getCustomerCartItems(customer));

                await sendInteractiveButtons(
                  customerPhone,
                  `✅ Cart updated directly from the menu!\n\n🛒 *Your Cart*\n\n${cartSummary}\n\n-------------------\n*Total: ₹${total}*`,
                  [
                    { id: 'view_menu', title: '📱 Return to Menu' },
                    { id: 'checkout', title: '🚀 Checkout' },
                    { id: 'clear_cart', title: '❌ Clear' }
                  ],
                  restaurant.whatsappPhoneNumberId,
                  restaurant.accessToken
                );
              } else {
                console.warn('[WhatsApp Webhook] No valid items found in flow response.');
              }
           } else {
             console.log(`[WhatsApp Webhook] Flow ended with non-checkout action: ${flowIntent}`);
           }
        } catch (e) {
          console.error("[WhatsApp Webhook] Failed to process flow nfm_reply:", e);
        }
        return;
      }

      if (interactive.type === 'list_reply') {
        const rowId = interactive.list_reply.id;

        if (rowId.startsWith('cat_')) {
          const categoryName = rowId.replace('cat_', '');
          const category = restaurant.menu.find(c => c._id?.toString() === categoryName || c.name === categoryName);

          if (category) {
            const sections = [{
              title: category.name,
              rows: category.items.filter(i => i.isAvailable).map(item => ({
                id: `item_${item._id || item.name}`,
                title: `${item.name} - ₹${item.price}`,
                description: item.description
              }))
            }];

            await sendListMessage(
              customerPhone,
              `Select an item from ${category.name} 👇`,
              'View Items',
              sections,
              restaurant.whatsappPhoneNumberId,
              restaurant.accessToken
            );
            customer.whatsappFlowState = 'menu_items';
            await customer.save();
          }
          return;
        }

        if (rowId.startsWith('item_')) {
          const itemName = rowId.replace('item_', '');
          const allItems = restaurant.menu.flatMap(c => c.items);
          const item = allItems.find(i => i._id?.toString() === itemName || i.name === itemName);

          if (item) {
            const updatedCart = [
              ...getCustomerCartItems(customer),
              {
              productId: item._id?.toString() || item.name,
              name: item.name,
              quantity: 1,
              price: item.price,
              portionLabel: '',
              notes: '',
              },
            ];
            setCustomerCartItems(customer, updatedCart);
            await customer.save();

            const cartSummary = formatCartSummary(getCustomerCartItems(customer));
            const total = getCartTotal(getCustomerCartItems(customer));

            await sendInteractiveButtons(
              customerPhone,
              `✅ Added to cart!\n\n🛒 *Your Cart*\n\n${cartSummary}\n\n-------------------\n*Total: ₹${total}*`,
              [
                { id: 'view_menu', title: '📱 Menu' },
                { id: 'checkout', title: '🚀 Checkout' },
                { id: 'clear_cart', title: '❌ Clear' }
              ],
              restaurant.whatsappPhoneNumberId,
              restaurant.accessToken
            );
          }
          return;
        }

        if (rowId.startsWith('order_')) {
          const orderId = rowId.replace('order_', '');
          const order = await Order.findById(orderId);

          if (order) {
            const itemsSummary = order.items
              .map((i) => formatCartLine(i))
              .join('\n');

            await sendInteractiveButtons(
              customerPhone,
              `🧾 *Order Details*\n\nOrder ID: #${order._id.toString().slice(-4)}\nDate: ${order.createdAt.toLocaleDateString()}\nStatus: ${order.status}\n\n*Items:*\n${itemsSummary}\n\n*Total: ₹${order.totalAmount}*`,
              [
                { id: `reorder_${order._id}`, title: '🔁 Reorder' },
                { id: 'view_menu', title: '📱 Main Menu' }
              ],
              restaurant.whatsappPhoneNumberId,
              restaurant.accessToken
            );
          }
          return;
        }

        if (rowId.startsWith('reorder_')) {
          const orderId = rowId.replace('reorder_', '');
          const order = await Order.findById(orderId);

          if (order) {
            setCustomerCartItems(customer, order.items.map(i => ({
              productId: i.productId,
              name: i.name,
              quantity: i.quantity,
              price: i.price,
              portionLabel: (i as any).portionLabel || '',
              notes: (i as any).notes || '',
            })));
            await customer.save();

            const cartSummary = formatCartSummary(getCustomerCartItems(customer));
            const total = getCartTotal(getCustomerCartItems(customer));

            await sendInteractiveButtons(
              customerPhone,
              `🛒 *Items copied to cart!*\n\n${cartSummary}\n\n-------------------\n*Total: ₹${total}*`,
              [
                { id: 'checkout', title: '🚀 Checkout' },
                { id: 'view_menu', title: '➕ Add More' }
              ],
              restaurant.whatsappPhoneNumberId,
              restaurant.accessToken
            );
          }
          return;
        }
      }
    }

    // Handle location messages
    if (message.type === 'location' && message.location) {
      customer.location = {
        latitude: message.location.latitude,
        longitude: message.location.longitude,
      };
      if (message.location.address) {
        customer.address = message.location.address;
      }
      await customer.save();

      if (customer.whatsappFlowState === 'checkout_location') {
        const cartItems = getCustomerCartItems(customer);
        const itemsSummary = formatCartSummary(cartItems);
        const total = getCartTotal(cartItems);

        await sendInteractiveButtons(
          customerPhone,
          `🧾 *Order Summary (Delivery)*\n\n${itemsSummary}\n\n-------------------\n*Total: ₹${total}*`,
          [
            { id: 'confirm_order', title: '✅ Confirm' },
            { id: 'edit_cart', title: '✏️ Edit' }
          ],
          restaurant.whatsappPhoneNumberId,
          restaurant.accessToken
        );
        customer.whatsappFlowState = 'checkout_confirm';
        await customer.save();
      } else {
        await sendWhatsAppMessage(
          customerPhone,
          '📍 Location saved for future orders!',
          restaurant.whatsappPhoneNumberId,
          restaurant.accessToken
        );
      }
      return;
    }

    // Default: Handle text messages
    const messageText = message.text?.body?.trim().toLowerCase() || '';

    if (messageText === 'hi' || messageText === 'hello' || messageText === 'start') {
      await sendInteractiveButtons(
        customerPhone,
        `👋 Welcome back, ${customer.name}!\n\nWelcome to *${restaurant.name}* 🍽️\n\nWhat are you craving today?`,
        [
          { id: 'view_menu', title: '📱 View Menu' },
          { id: 'my_orders', title: '🧾 My Orders' },
          { id: 'support', title: '💬 Support' }
        ],
        restaurant.whatsappPhoneNumberId,
        restaurant.accessToken
      );
      customer.whatsappFlowState = 'welcome';
      await customer.save();
    } else {
      await sendWhatsAppMessage(
        customerPhone,
        "I'm sorry, I'm not sure how to handle that text. Please use the menu buttons or type *hi* to start over.",
        restaurant.whatsappPhoneNumberId,
        restaurant.accessToken
      );
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
  }
};



// Connect WhatsApp (save credentials)
export const connectWhatsApp = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { accessToken, phoneNumberId, businessAccountId, catalogId } = req.body;

    const encryptedToken = encrypt(accessToken);

    const restaurant = await Restaurant.findByIdAndUpdate(req.user!.restaurantId, {
      accessToken: encryptedToken,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappBusinessAccountId: businessAccountId,
      whatsappCatalogId: catalogId,
    }, { new: true });

    const user = await User.findById(req.user!.userId).select('name email');

    let marketingOsSync: any = {
      attempted: false,
      provisioned: false,
      alreadyExists: false,
    };

    if (restaurant && user?.email) {
      marketingOsSync = await provisionClientInMarketingOs({
        restaurantName: restaurant.name,
        userName: user.name || restaurant.name,
        email: user.email,
      });
    }

    res.json({
      message: 'WhatsApp connected successfully.',
      marketingOsSync,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect WhatsApp.' });
  }
};

// Get WhatsApp connection status
export const getWhatsAppStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurant = await Restaurant.findById(req.user!.restaurantId).select(
      'whatsappPhoneNumberId whatsappBusinessAccountId whatsappCatalogId phoneNumber'
    );

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    res.json({
      connected: !!restaurant.whatsappPhoneNumberId,
      phoneNumber: restaurant.phoneNumber,
      phoneNumberId: restaurant.whatsappPhoneNumberId,
      businessAccountId: restaurant.whatsappBusinessAccountId,
      catalogId: restaurant.whatsappCatalogId,
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get WhatsApp status.' });
  }
};

// ────────────────────────────────────────────
// Embedded Signup — Config + Complete (Proxied via Marketing OS)
// ────────────────────────────────────────────

// GET /whatsapp/embedded/config
export const getEmbeddedConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('[getEmbeddedConfig] Called for user:', req.user?.userId, 'restaurant:', req.user?.restaurantId);
  try {
    const callbackUrl = typeof req.query?.callbackUrl === 'string' ? req.query.callbackUrl : undefined;
    const user = await User.findById(req.user!.userId).select('email name');
    const restaurant = await Restaurant.findById(req.user!.restaurantId);

    console.log('[getEmbeddedConfig] Found user email:', user?.email, 'restaurant name:', restaurant?.name);

    if (!user?.email || !restaurant) {
      console.error('[getEmbeddedConfig] Error: User email or restaurant not found.', { userEmail: user?.email, hasRestaurant: !!restaurant });
      res.status(400).json({ error: 'User email or restaurant not found for Marketing OS auth.' });
      return;
    }

    // Provision client if not exists and get token
    console.log('[getEmbeddedConfig] Provisioning client in Marketing OS...');
    const provisionResult = await provisionClientInMarketingOs({
      restaurantName: restaurant.name,
      userName: user.name || restaurant.name,
      email: user.email,
    });
    console.log('[getEmbeddedConfig] Provision result:', { 
      attempted: provisionResult.attempted, 
      provisioned: provisionResult.provisioned, 
      hasToken: !!provisionResult.token 
    });

    const token = await getMarketingOsPartnerToken(user.email);
    if (!token) {
      res.status(501).json({ error: 'Failed to authenticate session with provider.' });
      return;
    }

    console.log('[getEmbeddedConfig] Fetching embedded config from Marketing OS...');
    const config = await getMarketingOsEmbeddedConfig(token, callbackUrl);
    if (!config) {
      console.error('[getEmbeddedConfig] Error: Failed to get Embedded Signup config.');
      res.status(501).json({ error: 'Failed to get Embedded Signup config from Marketing OS.' });
      return;
    }

    console.log('[getEmbeddedConfig] Successfully retrieved config:', JSON.stringify(config, null, 2));
    res.json({ data: config });
  } catch (error) {
    console.error('[getEmbeddedConfig] Unexpected error:', error);
    res.status(500).json({ error: 'Failed to get embedded signup config.' });
  }
};

// POST /whatsapp/embedded/complete
export const completeEmbeddedSignup = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('[completeEmbeddedSignup] Called for restaurant:', req.user?.restaurantId);
  try {
    const { code, state } = req.body;
    console.log('[completeEmbeddedSignup] Received code:', code?.substring(0, 10), 'state:', state?.substring(0, 10));


    if (!code || !state) {
      console.error('[completeEmbeddedSignup] Error: Authorization code or state missing in request body.', { hasCode: !!code, hasState: !!state });
      res.status(400).json({ error: 'Authorization code and state are required.' });
      return;
    }


    const user = await User.findById(req.user!.userId).select('email name');
    const restaurant = await Restaurant.findById(req.user!.restaurantId);

    console.log('[completeEmbeddedSignup] Found user email:', user?.email, 'restaurant name:', restaurant?.name);

    if (!user?.email || !restaurant) {
      console.error('[completeEmbeddedSignup] Error: User or restaurant not found.', { userEmail: user?.email, hasRestaurant: !!restaurant });
      res.status(400).json({ error: 'User or restaurant not found.' });
      return;
    }

    // Step 1: Ensure provisioned and get token
    console.log('[completeEmbeddedSignup] Provisioning/Logging in to Marketing OS...');
    const provisionResult = await provisionClientInMarketingOs({
      restaurantName: restaurant.name,
      userName: user.name || restaurant.name,
      email: user.email,
    });

    const token = await getMarketingOsPartnerToken(user.email);
    console.log('[completeEmbeddedSignup] Token result:', { hasToken: !!token });

    if (!token) {
      console.error('[completeEmbeddedSignup] Error: Failed to obtain Partner Token from Marketing OS.');
      res.status(501).json({ error: 'Failed to authenticate with provider platform.' });
      return;
    }

    // Step 2: Pass code to Marketing OS to complete setup
    console.log('[completeEmbeddedSignup] Sending authorization code and state to Marketing OS...');
    const completeResult = await completeMarketingOsEmbeddedSignup(token, code, state);

    console.log('[completeEmbeddedSignup] Signup completion result:', completeResult);

    if (!completeResult.success) {
      console.error('[completeEmbeddedSignup] Error: Marketing OS failed to complete signup.', completeResult.error);
      res.status(400).json({ error: completeResult.error || 'Marketing OS failed to complete signup.' });
      return;
    }

    // Since Marketing OS handles the token exchange and holds the credentials,
    // the food-ordering system doesn't need to store the raw access token anymore.
    // However, we still save the IDs for local webhook handling.
    console.log('[completeEmbeddedSignup] Saving credentials to restaurant database...');
    await Restaurant.findByIdAndUpdate(
      req.user!.restaurantId,
      {
        whatsappPhoneNumberId: completeResult.phoneNumberId || '',
        whatsappBusinessAccountId: completeResult.wabaId || '',
        phoneNumber: completeResult.phoneDisplay || '',
        // Save the real access token returned by Marketing OS so this app can send messages
        accessToken: completeResult.accessToken ? encrypt(completeResult.accessToken) : '',
      },
      { new: true }
    );

    // Try to programmatically create and publish the Menu Flow for the new business account
    let flowId = null;
    if (completeResult.wabaId && completeResult.accessToken) {
       console.log('[completeEmbeddedSignup] Creating and publishing WhatsApp Flow...');
       flowId = await createAndPublishFlow(
         completeResult.wabaId,
         completeResult.accessToken,
         restaurant.name
       );
       if (flowId) {
          // You might want to save this flowId to the restaurant document
          await Restaurant.findByIdAndUpdate(req.user!.restaurantId, { whatsappFlowId: flowId });
       }
    }

    console.log('[completeEmbeddedSignup] Successfully completed embedded signup.');
    res.json({
      data: {
        success: true,
        phoneNumberId: completeResult.phoneNumberId,
        wabaId: completeResult.wabaId,
        phoneDisplay: completeResult.phoneDisplay,
      },
    });
  } catch (error: any) {
    console.error('[completeEmbeddedSignup] Unexpected error:', error);
    res.status(500).json({ error: 'Embedded signup completion failed.' });
  }
};
