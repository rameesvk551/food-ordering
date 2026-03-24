import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { env } from '../config/env';
import { encrypt } from '../utils/encryption';
import { AuthRequest } from '../middleware/auth';
import {
  sendWhatsAppMessage,
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

    if (!body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      return;
    }

    const change = body.entry[0].changes[0].value;
    const message = change.messages[0];
    const phoneNumberId = change.metadata?.phone_number_id;
    const customerPhone = message.from;
    const messageText = message.text?.body?.trim().toLowerCase() || '';

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
        whatsappUserId: message.from,
        name: change.contacts?.[0]?.profile?.name || '',
      });
      await customer.save();
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

      await sendWhatsAppMessage(
        customerPhone,
        '📍 Location saved! You can now place your order.',
        restaurant.whatsappPhoneNumberId,
        restaurant.accessToken
      );
      return;
    }

    // Parse intent from text messages
    if (messageText === 'menu' || messageText === 'hi' || messageText === 'hello') {
      const menuMsg = formatMenuMessage(restaurant);
      await sendWhatsAppMessage(
        customerPhone,
        menuMsg,
        restaurant.whatsappPhoneNumberId,
        restaurant.accessToken
      );
    } else if (messageText.startsWith('order')) {
      const orderData = parseOrderFromMessage(messageText, restaurant);
      if (orderData) {
        const order = new Order({
          restaurantId: restaurant._id,
          customerId: customer._id,
          items: orderData.items,
          totalAmount: orderData.totalAmount,
          status: 'pending',
          source: 'whatsapp',
          customerName: customer.name,
          customerPhone: customer.phoneNumber,
        });
        await order.save();

        const itemsSummary = orderData.items
          .map((i) => `${i.name} x${i.quantity} = ₹${i.price * i.quantity}`)
          .join('\n');

        await sendWhatsAppMessage(
          customerPhone,
          `✅ *Order Placed!*\n\n${itemsSummary}\n\n💰 *Total: ₹${orderData.totalAmount}*\n\nWe'll update you when it's confirmed!`,
          restaurant.whatsappPhoneNumberId,
          restaurant.accessToken
        );
      } else {
        await sendWhatsAppMessage(
          customerPhone,
          `❌ Sorry, I couldn't understand your order.\n\nPlease use the format:\n*order <item number> x <quantity>*\n\nType *menu* to see available items.`,
          restaurant.whatsappPhoneNumberId,
          restaurant.accessToken
        );
      }
    } else if (messageText === 'help') {
      await sendWhatsAppMessage(
        customerPhone,
        getHelpMessage(restaurant.name),
        restaurant.whatsappPhoneNumberId,
        restaurant.accessToken
      );
    } else {
      await sendWhatsAppMessage(
        customerPhone,
        getHelpMessage(restaurant.name),
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
    const { accessToken, phoneNumberId, businessAccountId } = req.body;

    const encryptedToken = encrypt(accessToken);

    await Restaurant.findByIdAndUpdate(req.user!.restaurantId, {
      accessToken: encryptedToken,
      whatsappPhoneNumberId: phoneNumberId,
      whatsappBusinessAccountId: businessAccountId,
    });

    res.json({ message: 'WhatsApp connected successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to connect WhatsApp.' });
  }
};

// Get WhatsApp connection status
export const getWhatsAppStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurant = await Restaurant.findById(req.user!.restaurantId).select(
      'whatsappPhoneNumberId whatsappBusinessAccountId phoneNumber'
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
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get WhatsApp status.' });
  }
};
