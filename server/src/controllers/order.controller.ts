import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import { Restaurant } from '../models/Restaurant';
import { Customer } from '../models/Customer';
import { sendWhatsAppMessage } from '../services/whatsapp.service';

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, source, page = '1', limit = '20' } = req.query;
    const filter: any = { restaurantId: req.user!.restaurantId };

    if (status) filter.status = status;
    if (source) filter.source = source;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),//
    ]);

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

export const getOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      restaurantId: req.user!.restaurantId,
    }).lean();

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status.' });
      return;
    }

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user!.restaurantId },
      { status },
      { new: true }
    );

    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    try {
      const [restaurant, customer] = await Promise.all([
        Restaurant.findById(order.restaurantId).select('whatsappPhoneNumberId accessToken'),
        Customer.findById(order.customerId).select('whatsappUserId phoneNumber'),
      ]);

      if (restaurant?.whatsappPhoneNumberId && (customer?.whatsappUserId || customer?.phoneNumber)) {
        await sendWhatsAppMessage(
          customer.whatsappUserId || customer.phoneNumber,
          `📦 Order #${order._id.toString().slice(-6)} update:\nStatus: *${order.status}*`,
          restaurant.whatsappPhoneNumberId,
          restaurant.accessToken
        );
      }
    } catch (notifyError) {
      console.error('Failed to send order status update on WhatsApp:', notifyError);
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status.' });
  }
};
