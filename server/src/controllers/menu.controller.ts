import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { AuthRequest } from '../middleware/auth';

export const getMenu = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const restaurant = await Restaurant.findById(req.user!.restaurantId);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }
    res.json({ menu: restaurant.menu });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu.' });
  }
};

export const updateMenu = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { menu } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.user!.restaurantId,
      { menu },
      { new: true }
    );
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }
    res.json({ menu: restaurant.menu });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu.' });
  }
};

export const addCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const restaurant = await Restaurant.findById(req.user!.restaurantId);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }
    restaurant.menu.push({ name, items: [] });
    await restaurant.save();
    res.status(201).json({ menu: restaurant.menu });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add category.' });
  }
};

export const addMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const { name, description, price, image } = req.body;
    const restaurant = await Restaurant.findById(req.user!.restaurantId);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const category = (restaurant.menu as any).id(categoryId);
    if (!category) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    category.items.push({ name, description, price, image, isAvailable: true });
    await restaurant.save();
    res.status(201).json({ menu: restaurant.menu });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add menu item.' });
  }
};

export const updateMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId, itemId } = req.params;
    const updates = req.body;
    const restaurant = await Restaurant.findById(req.user!.restaurantId);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const category = (restaurant.menu as any).id(categoryId);
    if (!category) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    const item = (category.items as any).id(itemId);
    if (!item) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    Object.assign(item, updates);
    await restaurant.save();
    res.json({ menu: restaurant.menu });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu item.' });
  }
};

export const deleteMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId, itemId } = req.params;
    const restaurant = await Restaurant.findById(req.user!.restaurantId);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const category = (restaurant.menu as any).id(categoryId);
    if (!category) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    (category.items as any).pull({ _id: itemId });
    await restaurant.save();
    res.json({ menu: restaurant.menu });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item.' });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const restaurant = await Restaurant.findById(req.user!.restaurantId);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    (restaurant.menu as any).pull({ _id: categoryId });
    await restaurant.save();
    res.json({ menu: restaurant.menu });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category.' });
  }
};
