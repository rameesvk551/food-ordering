import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';

export const getRestaurantSettings = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user?.restaurantId;
    if (!restaurantId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({
      _id: restaurant._id,
      name: restaurant.name,
      description: restaurant.description || '',
      phoneNumber: restaurant.phoneNumber,
      email: restaurant.email || '',
      images: restaurant.images || [],
      logo: restaurant.logo || '',
      address: restaurant.address || '',
      city: restaurant.city || '',
      state: restaurant.state || '',
      zipCode: restaurant.zipCode || '',
      latitude: restaurant.latitude || 0,
      longitude: restaurant.longitude || 0,
      cuisineTypes: restaurant.cuisineTypes || [],
      businessHours: restaurant.businessHours || {
        Monday: { open: '09:00', close: '23:00', isClosed: false },
        Tuesday: { open: '09:00', close: '23:00', isClosed: false },
        Wednesday: { open: '09:00', close: '23:00', isClosed: false },
        Thursday: { open: '09:00', close: '23:00', isClosed: false },
        Friday: { open: '09:00', close: '23:00', isClosed: false },
        Saturday: { open: '10:00', close: '00:00', isClosed: false },
        Sunday: { open: '10:00', close: '23:00', isClosed: false },
      },
      minDeliveryTime: restaurant.minDeliveryTime || 30,
      maxDeliveryTime: restaurant.maxDeliveryTime || 60,
      minOrderValue: restaurant.minOrderValue || 0,
      deliveryCharges: restaurant.deliveryCharges || 0,
      isActive: restaurant.isActive,
    });
  } catch (error) {
    console.error('Error fetching restaurant settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRestaurantSettings = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user?.restaurantId;
    if (!restaurantId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const {
      name,
      description,
      phoneNumber,
      email,
      images,
      logo,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      cuisineTypes,
      businessHours,
      minDeliveryTime,
      maxDeliveryTime,
      minOrderValue,
      deliveryCharges,
    } = req.body;

    const updateData: any = {
      name,
      description,
      phoneNumber,
      email,
      images,
      logo,
      address,
      city,
      state,
      zipCode,
      latitude,
      longitude,
      cuisineTypes,
      businessHours,
      minDeliveryTime,
      maxDeliveryTime,
      minOrderValue,
      deliveryCharges,
    };

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({
      _id: restaurant._id,
      name: restaurant.name,
      description: restaurant.description || '',
      phoneNumber: restaurant.phoneNumber,
      email: restaurant.email || '',
      images: restaurant.images || [],
      logo: restaurant.logo || '',
      address: restaurant.address || '',
      city: restaurant.city || '',
      state: restaurant.state || '',
      zipCode: restaurant.zipCode || '',
      latitude: restaurant.latitude || 0,
      longitude: restaurant.longitude || 0,
      cuisineTypes: restaurant.cuisineTypes || [],
      businessHours: restaurant.businessHours || {},
      minDeliveryTime: restaurant.minDeliveryTime || 30,
      maxDeliveryTime: restaurant.maxDeliveryTime || 60,
      minOrderValue: restaurant.minOrderValue || 0,
      deliveryCharges: restaurant.deliveryCharges || 0,
      isActive: restaurant.isActive,
    });
  } catch (error) {
    console.error('Error updating restaurant settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRestaurantImages = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user?.restaurantId;
    if (!restaurantId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { imageUrl, isLogo } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (isLogo) {
      restaurant.logo = imageUrl;
    } else {
      if (!restaurant.images) {
        restaurant.images = [];
      }
      restaurant.images.push(imageUrl);
    }

    await restaurant.save();

    res.json({
      success: true,
      images: restaurant.images || [],
      logo: restaurant.logo || '',
    });
  } catch (error) {
    console.error('Error updating restaurant images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeImage = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user?.restaurantId;
    if (!restaurantId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { imageIndex, isLogo } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    if (isLogo) {
      restaurant.logo = '';
    } else {
      if (restaurant.images && imageIndex !== undefined) {
        restaurant.images.splice(imageIndex, 1);
      }
    }

    await restaurant.save();

    res.json({
      success: true,
      images: restaurant.images || [],
      logo: restaurant.logo || '',
    });
  } catch (error) {
    console.error('Error removing image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRestaurantCuisines = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user?.restaurantId;
    if (!restaurantId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const restaurant = await Restaurant.findById(restaurantId, 'cuisineTypes');
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ cuisineTypes: restaurant.cuisineTypes || [] });
  } catch (error) {
    console.error('Error fetching cuisines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBusinessHours = async (req: Request, res: Response) => {
  try {
    const restaurantId = (req as any).user?.restaurantId;
    if (!restaurantId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { businessHours } = req.body;

    if (!businessHours) {
      return res.status(400).json({ error: 'Business hours are required' });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { businessHours },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ businessHours: restaurant.businessHours || {} });
  } catch (error) {
    console.error('Error updating business hours:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
