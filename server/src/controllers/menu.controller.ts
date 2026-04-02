import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { AuthRequest } from '../middleware/auth';

type PortionOptionPayload = {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  description?: unknown;
  isDefault?: unknown;
};

const normalizeImages = (image: unknown, images: unknown): string[] => {
  const imageList = Array.isArray(images)
    ? images.filter((entry): entry is string => typeof entry === 'string')
    : [];

  if (imageList.length > 0) {
    return imageList.map((entry) => entry.trim()).filter(Boolean);
  }

  if (typeof image === 'string' && image.trim()) {
    return [image.trim()];
  }

  return [];
};

const normalizePortionOptions = (portionOptions: unknown, basePrice: number) => {
  if (!Array.isArray(portionOptions)) {
    return [];
  }

  const cleaned = (portionOptions as PortionOptionPayload[])
    .map((option, index) => {
      const rawName = typeof option.name === 'string' ? option.name.trim() : '';
      const rawId = typeof option.id === 'string' ? option.id.trim() : '';
      const parsedPrice = Number(option.price);

      if (!rawName || Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return null;
      }

      const id = rawId || rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `option-${index + 1}`;

      return {
        id,
        name: rawName,
        price: parsedPrice,
        description: typeof option.description === 'string' ? option.description.trim() : '',
        isDefault: Boolean(option.isDefault),
      };
    })
    .filter((entry): entry is { id: string; name: string; price: number; description: string; isDefault: boolean } => Boolean(entry));

  if (cleaned.length === 0) {
    return [];
  }

  const hasDefault = cleaned.some((option) => option.isDefault);
  if (!hasDefault) {
    const matchByPrice = cleaned.find((option) => option.price === basePrice);
    if (matchByPrice) {
      matchByPrice.isDefault = true;
    } else {
      cleaned[0].isDefault = true;
    }
  }

  return cleaned;
};

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
    const { name, image } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }

    const categoryImage = typeof image === 'string' ? image.trim() : '';
    const restaurant = await Restaurant.findById(req.user!.restaurantId);
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }
    restaurant.menu.push({ name: trimmedName, image: categoryImage, items: [] });
    await restaurant.save();
    res.status(201).json({ menu: restaurant.menu });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add category.' });
  }
};

export const addMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const { name, description, price, image, images, portionOptions } = req.body;
    const parsedPrice = Number(price);
    if (!name || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      res.status(400).json({ error: 'Valid item name and price are required.' });
      return;
    }

    const normalizedImages = normalizeImages(image, images);
    const normalizedPortionOptions = normalizePortionOptions(portionOptions, parsedPrice);

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

    category.items.push({
      name: String(name).trim(),
      description: typeof description === 'string' ? description.trim() : '',
      price: parsedPrice,
      image: normalizedImages[0] || '',
      images: normalizedImages,
      portionOptions: normalizedPortionOptions,
      isAvailable: true,
    });
    await restaurant.save();
    res.status(201).json({ menu: restaurant.menu });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add menu item.' });
  }
};

export const updateMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { categoryId, itemId } = req.params;
    const updates = req.body as Record<string, unknown>;
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

    if (typeof updates.name === 'string') {
      item.name = updates.name.trim();
    }

    if (typeof updates.description === 'string') {
      item.description = updates.description.trim();
    }

    if (typeof updates.isAvailable === 'boolean') {
      item.isAvailable = updates.isAvailable;
    }

    if (updates.price !== undefined) {
      const parsedPrice = Number(updates.price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        res.status(400).json({ error: 'Price must be a valid number.' });
        return;
      }
      item.price = parsedPrice;
    }

    if (updates.images !== undefined || updates.image !== undefined) {
      const normalizedImages = normalizeImages(updates.image, updates.images);
      item.images = normalizedImages;
      item.image = normalizedImages[0] || '';
    }

    if (updates.portionOptions !== undefined) {
      item.portionOptions = normalizePortionOptions(updates.portionOptions, item.price);
    }

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
