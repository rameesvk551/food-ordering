import { Request, Response } from 'express';
import { Restaurant } from '../models/Restaurant';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';
import { sendWhatsAppMessage } from '../services/whatsapp.service';

const sanitizePhoneNumber = (phoneNumber: string): string => phoneNumber.replace(/\D/g, '');

const buildPhoneFilter = (phoneNumber: string) => {
  const normalized = sanitizePhoneNumber(phoneNumber || '');
  if (!normalized) {
    return { phoneNumber };
  }

  return {
    $or: [
      { phoneNumber },
      { phoneNumber: normalized },
      { phoneNumber: `+${normalized}` },
    ],
  };
};

const mapCustomerCartToWebCart = (items: any[] = []) =>
  (items || []).map((item: any) => {
    const productId = String(item?.productId || item?.product_id || '').trim();
    const portionId = String(item?.portionId || item?.portion_id || '').trim();
    const cartKey = `${productId}::${portionId || 'default'}`;

    return {
      cartKey,
      productId,
      name: String(item?.name || '').trim(),
      price: Math.max(0, Number(item?.price) || 0),
      quantity: Math.max(1, Number(item?.quantity) || 1),
      portionId: portionId || undefined,
      portionName: String(item?.portionName || item?.portionLabel || item?.portion_label || '').trim() || undefined,
    };
  }).filter((item: any) => item.productId && item.name);

const mapWebCartToCustomerCart = (items: any[] = []) =>
  (items || []).map((item: any) => ({
    productId: String(item?.productId || '').trim(),
    name: String(item?.name || '').trim(),
    quantity: Math.max(1, Number(item?.quantity) || 1),
    price: Math.max(0, Number(item?.price) || 0),
    portionLabel: String(item?.portionName || '').trim(),
    notes: String(item?.notes || '').trim(),
    portionId: String(item?.portionId || '').trim(),
  })).filter((item: any) => item.productId && item.name);

const getCartTotal = (items: any[] = []): number =>
  (items || []).reduce(
    (sum: number, item: any) => sum + Math.max(0, Number(item?.price) || 0) * Math.max(1, Number(item?.quantity) || 1),
    0
  );

const buildOrderSummary = (order: any): string => {
  const items = (order.items || [])
    .map((item: any) => `• ${item.name} x${item.quantity}`)
    .join('\n');

  return [
    `✅ Order placed successfully!`,
    `Order #${order._id.toString().slice(-6)}`,
    '',
    items,
    '',
    `Total: ₹${order.totalAmount}`,
    `Status: ${order.status}`,
  ].join('\n');
};

const findOrCreateCustomerForRestaurant = async (
  restaurantId: any,
  payload: { phone: string; name?: string; address?: string; pincode?: string; city?: string; district?: string }
) => {
  const phone = payload.phone || '';
  const normalized = sanitizePhoneNumber(phone);
  const customerPhone = normalized || phone;

  let customer = await Customer.findOne({
    ...buildPhoneFilter(phone),
    restaurantId,
  });

  if (!customer) {
    customer = new Customer({
      name: payload.name || '',
      phoneNumber: customerPhone,
      restaurantId,
      whatsappUserId: customerPhone,
      address: payload.address || '',
      pincode: payload.pincode || '',
      city: payload.city || '',
      district: payload.district || '',
      cartUpdatedAt: new Date(),
    });
    await customer.save();
    return customer;
  }

  if (payload.name) customer.name = payload.name;
  if (payload.address) customer.address = payload.address;
  if (payload.pincode) customer.pincode = payload.pincode;
  if (payload.city) customer.city = payload.city;
  if (payload.district) customer.district = payload.district;
  if (!customer.whatsappUserId) customer.whatsappUserId = customerPhone;
  await customer.save();

  return customer;
};

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

    const customer = await findOrCreateCustomerForRestaurant(restaurant._id, {
      phone: customerPhone,
      name: customerName,
      address,
      pincode,
      city,
      district,
    });

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

    try {
      if (customer.whatsappUserId || customer.phoneNumber) {
        await sendWhatsAppMessage(
          customer.whatsappUserId || customer.phoneNumber,
          buildOrderSummary(order),
          restaurant.whatsappPhoneNumberId,
          restaurant.accessToken
        );
      }
    } catch (whatsAppError) {
      console.error('Failed to send web order update in WhatsApp:', whatsAppError);
    }

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

export const resolveCustomerSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { phone, name, address, pincode, city, district } = req.body || {};

    if (!phone) {
      res.status(400).json({ error: 'Phone is required.' });
      return;
    }

    const restaurant = await Restaurant.findOne({ slug, isActive: true }).select('name slug');
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const customer = await findOrCreateCustomerForRestaurant(restaurant._id, {
      phone,
      name,
      address,
      pincode,
      city,
      district,
    });

    res.json({
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phoneNumber,
        address: customer.address,
        pincode: customer.pincode,
        city: customer.city,
        district: customer.district,
      },
      cart: mapCustomerCartToWebCart(customer.whatsappCart || []),
      cartUpdatedAt: customer.cartUpdatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve customer session.' });
  }
};

export const getCustomerCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const phone = String(req.query.phone || '');

    if (!phone) {
      res.status(400).json({ error: 'Phone is required.' });
      return;
    }

    const restaurant = await Restaurant.findOne({ slug, isActive: true }).select('_id');
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const customer = await Customer.findOne({
      ...buildPhoneFilter(phone),
      restaurantId: restaurant._id,
    });

    if (!customer) {
      res.json({ items: [], cartUpdatedAt: null });
      return;
    }

    res.json({
      items: mapCustomerCartToWebCart(customer.whatsappCart || []),
      cartUpdatedAt: customer.cartUpdatedAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cart.' });
  }
};

export const upsertCustomerCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { phone, items, customerName } = req.body || {};

    if (!phone) {
      res.status(400).json({ error: 'Phone is required.' });
      return;
    }

    const restaurant = await Restaurant.findOne({ slug, isActive: true });
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const customer = await findOrCreateCustomerForRestaurant(restaurant._id, {
      phone,
      name: customerName,
    });

    customer.whatsappCart = mapWebCartToCustomerCart(items || []);
    customer.cartUpdatedAt = new Date();
    await customer.save();

    res.json({
      items: mapCustomerCartToWebCart(customer.whatsappCart || []),
      cartUpdatedAt: customer.cartUpdatedAt,
      totalAmount: getCartTotal(customer.whatsappCart || []),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync cart.' });
  }
};

export const getCustomerOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const phone = String(req.query.phone || '');

    if (!phone) {
      res.status(400).json({ error: 'Phone is required.' });
      return;
    }

    const restaurant = await Restaurant.findOne({ slug, isActive: true }).select('_id');
    if (!restaurant) {
      res.status(404).json({ error: 'Restaurant not found.' });
      return;
    }

    const customer = await Customer.findOne({
      ...buildPhoneFilter(phone),
      restaurantId: restaurant._id,
    }).select('_id');

    if (!customer) {
      res.json({ orders: [] });
      return;
    }

    const orders = await Order.find({
      restaurantId: restaurant._id,
      customerId: customer._id,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer orders.' });
  }
};
