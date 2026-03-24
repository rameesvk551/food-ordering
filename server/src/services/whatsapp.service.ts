import axios from 'axios';
import { Restaurant, IRestaurant } from '../models/Restaurant';
import { decrypt } from '../utils/encryption';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

export const sendWhatsAppMessage = async (
  phoneNumber: string,
  message: string,
  phoneNumberId: string,
  accessToken: string
): Promise<void> => {
  try {
    const decryptedToken = decrypt(accessToken);
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
  const orderMatch = message.toLowerCase().match    (/order\s+(\d+)\s*x\s*(\d+)/g);

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
