import { Request, Response } from 'express';
import { Customer } from '../models/Customer';
import { AuthRequest } from '../middleware/auth';

export const getCustomers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customers = await Customer.find({ restaurantId: req.user!.restaurantId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ customers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
};

export const getCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      restaurantId: req.user!.restaurantId,
    }).lean();

    if (!customer) {
      res.status(404).json({ error: 'Customer not found.' });
      return;
    }

    res.json({ customer });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer.' });
  }
};
