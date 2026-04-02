import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';

const sanitizePhoneNumber = (phoneNumber: string): string => phoneNumber.replace(/\D/g, '');

const getDefaultPrice = (item: {
  price: number;
  portionOptions?: Array<{ price: number; isDefault?: boolean }>;
}): number => {
  if (!Array.isArray(item.portionOptions) || item.portionOptions.length === 0) {
    return item.price;
  }

  const defaultOption = item.portionOptions.find((option) => option.isDefault);
  return defaultOption?.price ?? item.portionOptions[0].price ?? item.price;
};

const getPrimaryItemImage = (item: { image?: string; images?: string[] }): string =>
  item.image || item.images?.[0] || '';

// Get all available menu items across all active restaurants
export const getAllRestaurantMenus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const restaurants = await Restaurant.find({ isActive: true }).select(
      'name slug phoneNumber menu'
    );

    const items = restaurants.flatMap((restaurant) => {
      const whatsappNumber = sanitizePhoneNumber(restaurant.phoneNumber || '');
      const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';

      return restaurant.menu.flatMap((category) =>
        category.items
          .filter((item) => item.isAvailable)
          .map((item) => ({
            id: item._id,
            name: item.name,
            description: item.description,
            price: getDefaultPrice(item),
            image: getPrimaryItemImage(item),
            images: item.images || (item.image ? [item.image] : []),
            portionOptions: item.portionOptions || [],
            category: category.name,
            restaurant: {
              id: restaurant._id,
              name: restaurant.name,
              slug: restaurant.slug,
              phoneNumber: restaurant.phoneNumber,
              whatsappUrl,
            },
          }))
      );
    });

    res.json({
      items,
      restaurants: restaurants.map((restaurant) => ({
        id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
        phoneNumber: restaurant.phoneNumber,
        whatsappUrl: restaurant.phoneNumber
          ? `https://wa.me/${sanitizePhoneNumber(restaurant.phoneNumber)}`
          : '',
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch restaurant menus.' });
  }
};

// Get restaurant by slug (public - for customer store page)
export const getStoreBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const restaurant = await Restaurant.findOne({ slug, isActive: true }).select(
      'name slug phoneNumber menu'
    );

    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    res.json({ restaurant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store.' });
  }
};

// Place order from web (public - customer places order)
export const placeWebOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { customerName, customerPhone, items, address, pincode, city, district } = req.body;

    const restaurant = await Restaurant.findOne({ slug, isActive: true });
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    // Find or create customer
    let customer = await Customer.findOne({
      phoneNumber: customerPhone,
      restaurantId: restaurant._id,
    });

    if (!customer) {
      customer = new Customer({
        name: customerName,
        phoneNumber: customerPhone,
        restaurantId: restaurant._id,
        address: address || '',
        pincode: pincode || '',
        city: city || '',
        district: district || '',
      });
      await customer.save();
    } else {
      // Update customer info if provided
      if (customerName) customer.name = customerName;
      if (address) customer.address = address;
      if (pincode) customer.pincode = pincode;
      if (city) customer.city = city;
      if (district) customer.district = district;
      await customer.save();
    }

    // Validate items against menu
    const allMenuItems = restaurant.menu.flatMap((cat) => cat.items);
    let totalAmount = 0;
    const validatedItems = items.map((item: any) => {
      const menuItem = allMenuItems.find(
        (mi) => (mi as any)._id?.toString() === item.productId
      );
      if (!menuItem) {
        throw new Error(`Item not found: ${item.productId}`);
      }

      const selectedPortion = Array.isArray(menuItem.portionOptions)
        ? menuItem.portionOptions.find((option) => option.id === item.portionId)
        : undefined;

      const unitPrice = selectedPortion?.price ?? menuItem.price;
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      const nameWithPortion = selectedPortion
        ? `${menuItem.name} (${selectedPortion.name})`
        : menuItem.name;

      return {
        productId: item.productId,
        name: nameWithPortion,
        quantity: item.quantity,
        price: unitPrice,
      };
    });

    const order = new Order({
      restaurantId: restaurant._id,
      customerId: customer._id,
      items: validatedItems,
      totalAmount,
      status: 'pending',
      source: 'web',
      customerName: customer.name,
      customerPhone: customer.phoneNumber,
    });
    await order.save();

    res.status(201).json({
      order: {
        id: order._id,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Place order error:', error);
    res.status(500).json({ error: error.message || 'Failed to place order.' });
  }
};
