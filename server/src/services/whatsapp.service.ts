import axios from 'axios';
import { Restaurant, IRestaurant } from '../models/Restaurant';
import { decrypt } from '../utils/encryption';
import { env } from '../config/env';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

export const sendWhatsAppMessage = async (
  phoneNumber: string,
  message: string,
  phoneNumberId: string,
  accessToken: string
): Promise<void> => {
  try {
    const decryptedToken = env.whatsappAccessToken || (accessToken ? decrypt(accessToken) : '');
    await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${decryptedToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('WhatsApp send error:', error.response?.data || error.message);
    throw new Error('Failed to send WhatsApp message');
  }
};

export const sendInteractiveButtons = async (
  phoneNumber: string,
  body: string,
  buttons: { id: string; title: string }[],
  phoneNumberId: string,
  accessToken: string,
  header?: string,
  footer?: string
): Promise<void> => {
  try {
    const decryptedToken = env.whatsappAccessToken || (accessToken ? decrypt(accessToken) : '');
    await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: header ? { type: 'text', text: header } : undefined,
          body: { text: body },
          footer: footer ? { text: footer } : undefined,
          action: {
            buttons: buttons.map((b) => ({
              type: 'reply',
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${decryptedToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('WhatsApp send buttons error:', error.response?.data || error.message);
    throw new Error('Failed to send WhatsApp buttons');
  }
};

export const sendListMessage = async (
  phoneNumber: string,
  body: string,
  buttonText: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[],
  phoneNumberId: string,
  accessToken: string,
  header?: string,
  footer?: string
): Promise<void> => {
  try {
    const decryptedToken = env.whatsappAccessToken || (accessToken ? decrypt(accessToken) : '');
    await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: header ? { type: 'text', text: header } : undefined,
          body: { text: body },
          footer: footer ? { text: footer } : undefined,
          action: {
            button: buttonText,
            sections: sections.map((s) => ({
              title: s.title,
              rows: s.rows.map((r) => ({
                id: r.id,
                title: r.title,
                description: r.description,
              })),
            })),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${decryptedToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('WhatsApp send list error:', error.response?.data || error.message);
    throw new Error('Failed to send WhatsApp list');
  }
};

export const sendFlowMessage = async (
  phoneNumber: string,
  bodyText: string,
  buttonText: string,
  flowId: string,
  flowToken: string, // Often passed as the restaurant ID so we know context in the webhook
  phoneNumberId: string,
  accessToken: string,
  header?: string,
  footer?: string
): Promise<void> => {
  try {
    const decryptedToken = env.whatsappAccessToken || (accessToken ? decrypt(accessToken) : '');
    await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'flow',
          header: header ? { type: 'text', text: header } : undefined,
          body: { text: bodyText },
          footer: footer ? { text: footer } : undefined,
          action: {
            name: 'flow',
            parameters: {
              flow_message_version: '3',
              flow_token: flowToken,
              flow_id: flowId,
              flow_cta: buttonText,
              flow_action: 'navigate',
              flow_action_payload: {
                screen: 'CATEGORIES'
              }
            }
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${decryptedToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('WhatsApp send flow message error:', error.response?.data || error.message);
    throw new Error('Failed to send WhatsApp Flow message');
  }
};

export const sendLocationRequest = async (
  phoneNumber: string,
  body: string,
  phoneNumberId: string,
  accessToken: string
): Promise<void> => {
  try {
    const decryptedToken = env.whatsappAccessToken || (accessToken ? decrypt(accessToken) : '');
    await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'location_request_message',
          body: { text: body },
          action: { name: 'send_location' },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${decryptedToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('WhatsApp send location request error:', error.response?.data || error.message);
    throw new Error('Failed to send location request');
  }
};

export const sendProductListMessage = async (
  phoneNumber: string,
  catalogId: string,
  body: string,
  sections: { title: string; product_items: { product_retailer_id: string }[] }[],
  phoneNumberId: string,
  accessToken: string,
  header?: string,
  footer?: string
): Promise<void> => {
  try {
    const decryptedToken = env.whatsappAccessToken || (accessToken ? decrypt(accessToken) : '');
    await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'product_list',
          header: header ? { type: 'text', text: header } : undefined,
          body: { text: body },
          footer: footer ? { text: footer } : undefined,
          action: {
            catalog_id: catalogId,
            sections: sections,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${decryptedToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('WhatsApp send product list error:', error.response?.data || error.message);
    throw new Error('Failed to send product list');
  }
};

export const sendOrderDetailsMessage = async (
  phoneNumber: string,
  order: any,
  phoneNumberId: string,
  accessToken: string
): Promise<void> => {
  try {
    const decryptedToken = env.whatsappAccessToken || (accessToken ? decrypt(accessToken) : '');
    await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'interactive',
        interactive: {
          type: 'order_details',
          body: { text: 'Confirm your order and pay' },
          action: {
            name: 'review_and_pay',
            parameters: {
              reference_id: order._id.toString(),
              type: 'physical-goods',
              payment_type: 'upi',
              payment_settings: [
                {
                  type: 'upi_intent',
                  upi_intent: {
                    merchant_name: 'Spice Garden Restaurant',
                  },
                },
              ],
              order: {
                status: 'pending',
                catalog_id: order.restaurantId.whatsappCatalogId || '',
                items: order.items.map((i: any) => ({
                  retailer_id: i.productId,
                  name: i.name,
                  amount: {
                    value: i.price * 100, // Smallest unit (cents/paise)
                    offset: 100,
                  },
                  quantity: i.quantity,
                })),
                subtotal: {
                  value: order.totalAmount * 100,
                  offset: 100,
                },
                tax: {
                  value: 0,
                  offset: 100,
                },
                shipping: {
                  value: 0,
                  offset: 100,
                },
                discount: {
                  value: 0,
                  offset: 100,
                },
                total_amount: {
                  value: order.totalAmount * 100,
                  offset: 100,
                  currency: 'INR',
                },
              },
            },
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${decryptedToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('WhatsApp send order details error:', error.response?.data || error.message);
    throw new Error('Failed to send order details');
  }
};

export const formatMenuMessage = (restaurant: IRestaurant): string => {
  let message = `🍽️ *${restaurant.name} - Menu*\n\n`;

  restaurant.menu.forEach((category) => {
    message += `📌 *${category.name}*\n`;
    category.items
      .filter((item) => item.isAvailable)
      .forEach((item, index) => {
        message += `  ${index + 1}. ${item.name} - ₹${item.price}\n`;
        if (item.description) {
          message += `     _${item.description}_\n`;
        }
      });
    message += '\n';
  });

  message += `\nTo order, reply with:\n*order <item number> x <quantity>*\nExample: order 1 x 2`;

  return message;
};

export const parseOrderFromMessage = (
  message: string,
  restaurant: IRestaurant
): { items: any[]; totalAmount: number } | null => {
  const orderMatch = message.toLowerCase().match(/order\s+(\d+)\s*x\s*(\d+)/g);

  if (!orderMatch) return null;

  const allItems = restaurant.menu.flatMap((cat) =>
    cat.items.filter((item) => item.isAvailable)
  );

  const items: any[] = [];
  let totalAmount = 0;

  orderMatch.forEach((match) => {
    const parts = match.match(/order\s+(\d+)\s*x\s*(\d+)/);
    if (parts) {
      const itemIndex = parseInt(parts[1], 10) - 1;
      const quantity = parseInt(parts[2], 10);

      if (itemIndex >= 0 && itemIndex < allItems.length && quantity > 0) {
        const item = allItems[itemIndex];
        const itemTotal = item.price * quantity;
        items.push({
          productId: (item as any)._id?.toString() || '',
          name: item.name,
          quantity,
          price: item.price,
        });
        totalAmount += itemTotal;
      }
    }
  });

  if (items.length === 0) return null;

  return { items, totalAmount };
};

export const getHelpMessage = (restaurantName: string): string => {
  return (
    `👋 Welcome to *${restaurantName}*!\n\n` +
    `Here's what you can do:\n\n` +
    `📋 Type *menu* - View our menu\n` +
    `🛒 Type *order <number> x <qty>* - Place an order\n` +
    `❓ Type *help* - See this message again\n\n` +
    `Example: *order 1 x 2* orders 2 of item #1`
  );
};

