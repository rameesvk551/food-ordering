import { Request, Response } from 'express';
import crypto from 'crypto';
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
} from '../services/whatsapp.service';


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
  try {
    // Always respond 200 to WhatsApp quickly
    res.status(200).send('OK');

    const body = req.body;

    // Verify signature if secret is configured
    const signature = req.headers['x-marketing-os-signature'] as string;
    if (env.marketingOsWebhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', env.marketingOsWebhookSecret);
      const computed = `sha256=${hmac.update(JSON.stringify(body)).digest('hex')}`;
      
      if (signature !== computed) {
        console.warn('[Webhook] Invalid signature received!');
        res.status(401).send('Invalid signature');
        return;
      }
    }

    if (!body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      return;
    }

    const change = body.entry[0].changes[0].value;
    const message = change.messages[0];
    const phoneNumberId = change.metadata?.phone_number_id;
    const customerPhone = message.from;
    const customerName = change.contacts?.[0]?.profile?.name || 'there';

    // Identify restaurant by phone number ID
    const restaurant = await Restaurant.findOne({ whatsappPhoneNumberId: phoneNumberId });
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
          // Send category list
          const sections = [{
            title: 'Our Menu',
            rows: restaurant.menu.map(cat => ({
              id: `cat_${cat._id || cat.name}`,
              title: cat.name
            }))
          }];

          await sendListMessage(
            customerPhone,
            'Choose a category 👇',
            'Select Category',
            sections,
            restaurant.whatsappPhoneNumberId,
            restaurant.accessToken,
            '🍽️ Our Menu'
          );
          customer.whatsappFlowState = 'menu_category';
          await customer.save();
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
          if (customer.whatsappCart.length === 0) {
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
          const itemsSummary = customer.whatsappCart
            .map((i: any) => `${i.name} x${i.quantity} - ₹${i.price * i.quantity}`)
            .join('\n');
          const total = customer.whatsappCart.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);

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
          const total = customer.whatsappCart.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
          const order = new Order({
            restaurantId: restaurant._id,
            customerId: customer._id,
            items: customer.whatsappCart,
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
          customer.whatsappCart = [];
          await customer.save();
          return;
        }

        if (buttonId === 'clear_cart') {
          customer.whatsappCart = [];
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
          // Send main categories
          const sections = [{
            title: 'Our Menu',
            rows: restaurant.menu.map(cat => ({
              id: `cat_${cat._id || cat.name}`,
              title: cat.name
            }))
          }];

          await sendListMessage(
            customerPhone,
            'Choose a category 👇',
            'Select Category',
            sections,
            restaurant.whatsappPhoneNumberId,
            restaurant.accessToken,
            '🍽️ Our Menu'
          );
          customer.whatsappFlowState = 'menu_category';
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
            customer.whatsappCart.push({
              productId: item._id?.toString() || item.name,
              name: item.name,
              quantity: 1,
              price: item.price
            });
            await customer.save();

            const cartSummary = customer.whatsappCart
              .map((i: any) => `${i.name} x${i.quantity} - ₹${i.price * i.quantity}`)
              .join('\n');
            const total = customer.whatsappCart.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);

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
              .map((i) => `${i.name} x${i.quantity}`)
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
            customer.whatsappCart = order.items.map(i => ({
              productId: i.productId,
              name: i.name,
              quantity: i.quantity,
              price: i.price
            }));
            await customer.save();

            const cartSummary = customer.whatsappCart
              .map((i: any) => `${i.name} x${i.quantity} - ₹${i.price * i.quantity}`)
              .join('\n');
            const total = customer.whatsappCart.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);

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
        const itemsSummary = customer.whatsappCart
          .map((i: any) => `${i.name} x${i.quantity} - ₹${i.price * i.quantity}`)
          .join('\n');
        const total = customer.whatsappCart.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);

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
