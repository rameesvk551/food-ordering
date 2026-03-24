import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { env } from '../config/env';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, restaurantName } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'Email already registered.' });
      return;
    }

    const restaurant = new Restaurant({
      name: restaurantName,
    });
    await restaurant.save();

    const user = new User({
      name,
      email,
      password,
      restaurantId: restaurant._id,
      role: 'admin',
    });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, restaurantId: restaurant._id, role: user.role },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: restaurant._id,
        restaurantSlug: restaurant.slug,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const restaurant = await Restaurant.findById(user.restaurantId);

    const token = jwt.sign(
      { userId: user._id, restaurantId: user.restaurantId, role: user.role },
      env.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        restaurantSlug: restaurant?.slug || '',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as any;
    const user = await User.findById(authReq.user.userId).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const restaurant = await Restaurant.findById(user.restaurantId);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        restaurantSlug: restaurant?.slug || '',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info.' });
  }
};
