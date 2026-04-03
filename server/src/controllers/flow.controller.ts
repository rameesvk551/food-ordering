import { Request, Response } from 'express';
import axios from 'axios';
import { decryptFlowRequest, encryptFlowResponse } from '../utils/flowEncryption';
import {
  Restaurant,
  IMenuCategory,
  IMenuItem,
  IMenuPortionOption,
} from '../models/Restaurant';
import { Customer } from '../models/Customer';
import { env } from '../config/env';

const WAYO_TENANT_IDS = [
  'b78ba0d3-3563-441d-b657-619f79e2e58e',
  'b78ba0d3-9efc-464e-bced-30784ae2e58e',
];

const DEFAULT_FLOW_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

const Base64ImageCache = new Map<string, string>();

type FlowRadioOption = {
  id: string;
  title: string;
  description?: string;
  image?: string;
  'alt-text'?: string;
};

type FlowCarouselImage = {
  src: string;
  'alt-text': string;
};

type FlowCartItem = {
  line_id: string;
  product_id: string;
  name: string;
  portion_id: string;
  portion_label: string;
  quantity: string;
  unit_price: string;
  notes: string;
};

const QUANTITY_OPTIONS: FlowRadioOption[] = Array.from({ length: 5 }, (_, index) => ({
  id: String(index + 1),
  title: String(index + 1),
}));

type FlowImageVariant = 'thumb' | 'detail';

const getFlowImageTransform = (variant: FlowImageVariant): string =>
  variant === 'detail'
    ? 'w_360,h_240,c_fill,f_jpg,q_auto'
    : 'w_200,h_200,c_fill,f_jpg,q_auto';

const toFlowBase64Image = async (
  url?: string,
  variant: FlowImageVariant = 'thumb'
): Promise<string> => {
  if (!url || typeof url !== 'string' || url === '') return DEFAULT_FLOW_IMAGE_BASE64;
  if (url.startsWith('data:image/')) {
    const [, base64Payload = ''] = url.split(',', 2);
    return base64Payload || DEFAULT_FLOW_IMAGE_BASE64;
  }

  let absoluteUrl = url;
  const cloudinaryTransform = getFlowImageTransform(variant);
  if (url.startsWith('/uploads/')) {
    const baseUrl = env.marketingOsApiBaseUrl
      ? env.marketingOsApiBaseUrl.split('/api')[0]
      : 'https://api.app.wayon.in';
    absoluteUrl = `${baseUrl}${url}`;
  } else if (!url.startsWith('http')) {
    if (env.cloudinaryCloudName) {
      absoluteUrl = `https://res.cloudinary.com/${env.cloudinaryCloudName}/image/upload/${cloudinaryTransform}/${url}`;
    } else {
      return DEFAULT_FLOW_IMAGE_BASE64;
    }
  } else if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    absoluteUrl = url.replace('/image/upload/', `/image/upload/${cloudinaryTransform}/`);
  }

  const cacheKey = `${variant}:${absoluteUrl}`;
  if (Base64ImageCache.has(cacheKey)) {
    return Base64ImageCache.get(cacheKey)!;
  }

  try {
    console.log(`[Flow] [ImageProxy] Converting image to Base64 (RAW): ${absoluteUrl.slice(0, 60)}...`);
    const response = await axios.get(absoluteUrl, {
      responseType: 'arraybuffer',
      timeout: 5000,
    });

    const base64 = Buffer.from(response.data).toString('base64');
    Base64ImageCache.set(cacheKey, base64);
    return base64;
  } catch (error: any) {
    console.error(`[Flow] [ImageProxy] Failed to fetch: ${absoluteUrl}`, error.message);
    return DEFAULT_FLOW_IMAGE_BASE64;
  }
};

const getItemImageSources = (item?: IMenuItem | null, maxImages = 3): string[] => {
  const sources = [
    item?.image,
    ...(Array.isArray(item?.images) ? item.images : []),
  ];

  return Array.from(
    new Set(
      sources
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  ).slice(0, maxImages);
};

const getItemPrimaryImage = (item?: IMenuItem | null): string => getItemImageSources(item, 1)[0] || '';

const getCategoryImage = (category: IMenuCategory): string => {
  if (category?.image) return category.image;
  const firstItemImage = Array.isArray(category?.items)
    ? getItemPrimaryImage(category.items.find((item: IMenuItem) => Boolean(getItemPrimaryImage(item))))
    : undefined;
  return firstItemImage || '';
};

const getCategoryId = (category?: IMenuCategory | null): string =>
  category?._id?.toString() || category?.name || '';

const getItemId = (item?: IMenuItem | null): string =>
  item?._id?.toString() || item?.name || '';

const coerceString = (value: any): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return coerceString(value[0]);
  if (value && typeof value === 'object') {
    return coerceString(value.id || value.title || value.value || value.name);
  }
  return '';
};

const toPositiveInt = (value: any, fallback = 1): number => {
  const parsed = parseInt(coerceString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeText = (value: string, maxLength = 160): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, maxLength);

const formatCurrency = (amount: number): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted =
    safeAmount % 1 === 0
      ? safeAmount.toFixed(0)
      : safeAmount.toFixed(2).replace(/\.?0+$/, '');
  return `INR ${formatted}`;
};

const getDefaultPortionOptions = (item: IMenuItem, category?: IMenuCategory | null): IMenuPortionOption[] => {
  const lookupText = `${category?.name || ''} ${item.name}`.toLowerCase();
  const basePrice = item.price || 0;

  const buildOptions = (
    variants: Array<{ id: string; name: string; multiplier: number; description: string; isDefault?: boolean }>
  ): IMenuPortionOption[] =>
    variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: Math.max(1, Math.round(basePrice * variant.multiplier)),
      description: variant.description,
      isDefault: Boolean(variant.isDefault),
    }));

  if (/(biryani|indian|rice|curry|gravy|thali|kebab|tandoori)/i.test(lookupText)) {
    return buildOptions([
      { id: 'quarter', name: 'Quarter', multiplier: 0.65, description: 'Light portion', isDefault: false },
      { id: 'half', name: 'Half', multiplier: 1, description: 'Most popular', isDefault: true },
      { id: 'full', name: 'Full', multiplier: 1.8, description: 'Best for sharing', isDefault: false },
    ]);
  }

  if (/(pizza)/i.test(lookupText)) {
    return buildOptions([
      { id: 'personal', name: 'Personal', multiplier: 0.9, description: '1 person', isDefault: false },
      { id: 'regular', name: 'Regular', multiplier: 1, description: 'Best value', isDefault: true },
      { id: 'large', name: 'Large', multiplier: 1.35, description: 'Great for sharing', isDefault: false },
    ]);
  }

  if (/(burger|sandwich|wrap|taco)/i.test(lookupText)) {
    return buildOptions([
      { id: 'single', name: 'Single', multiplier: 1, description: 'Classic portion', isDefault: true },
      { id: 'double', name: 'Double', multiplier: 1.65, description: 'Extra filling', isDefault: false },
      { id: 'combo', name: 'Combo', multiplier: 2.2, description: 'Meal style', isDefault: false },
    ]);
  }

  if (/(pasta|noodle|sushi|salad|dessert|steak)/i.test(lookupText)) {
    return buildOptions([
      { id: 'regular', name: 'Regular', multiplier: 1, description: 'Classic serving', isDefault: true },
      { id: 'large', name: 'Large', multiplier: 1.4, description: 'Hungry portion', isDefault: false },
      { id: 'sharing', name: 'Sharing', multiplier: 1.9, description: '2-3 people', isDefault: false },
    ]);
  }

  return [
    {
      id: 'standard',
      name: 'Standard',
      price: basePrice,
      description: 'Classic serving',
      isDefault: true,
    },
  ];
};

const getPortionOptions = (item: IMenuItem, category?: IMenuCategory | null): IMenuPortionOption[] => {
  if (Array.isArray(item.portionOptions) && item.portionOptions.length > 0) {
    return item.portionOptions.map((option) => ({
      id: option.id,
      name: option.name,
      price: option.price,
      description: option.description || '',
      isDefault: Boolean(option.isDefault),
    }));
  }

  return getDefaultPortionOptions(item, category);
};

const getSelectedPortion = (
  item: IMenuItem,
  category: IMenuCategory | null | undefined,
  selectedPortionId: string
): IMenuPortionOption => {
  const options = getPortionOptions(item, category);
  return (
    options.find((option) => option.id === selectedPortionId) ||
    options.find((option) => option.isDefault) ||
    options[0]
  );
};

const normalizeCartItems = (value: any): FlowCartItem[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry: any): FlowCartItem | null => {
      const productId = coerceString(entry?.product_id || entry?.productId || entry?.item_id);
      const name = normalizeText(coerceString(entry?.name), 80);
      if (!productId || !name) return null;

      const quantity = String(toPositiveInt(entry?.quantity, 1));
      const unitPriceRaw = parseFloat(coerceString(entry?.unit_price || entry?.unitPrice || entry?.price));
      const unitPrice = Number.isFinite(unitPriceRaw) && unitPriceRaw >= 0 ? unitPriceRaw : 0;

      return {
        line_id: coerceString(entry?.line_id || entry?.lineId) || `${productId}_${Math.random().toString(36).slice(2, 8)}`,
        product_id: productId,
        name,
        portion_id: normalizeText(coerceString(entry?.portion_id || entry?.portionId), 40),
        portion_label: normalizeText(coerceString(entry?.portion_label || entry?.portionLabel), 40),
        quantity,
        unit_price: String(unitPrice),
        notes: normalizeText(coerceString(entry?.notes), 140),
      };
    })
    .filter((entry: FlowCartItem | null): entry is FlowCartItem => Boolean(entry));
};

const buildCartPreview = (cartItems: FlowCartItem[]) => {
  const total = cartItems.reduce((sum, item) => {
    const quantity = toPositiveInt(item.quantity, 1);
    const unitPrice = parseFloat(item.unit_price) || 0;
    return sum + quantity * unitPrice;
  }, 0);
  const totalQuantity = cartItems.reduce(
    (sum, item) => sum + toPositiveInt(item.quantity, 1),
    0
  );

  const summary = cartItems
    .map((item, index) => {
      const quantity = toPositiveInt(item.quantity, 1);
      const unitPrice = parseFloat(item.unit_price) || 0;
      const lineTotal = unitPrice * quantity;
      const detailParts = [
        item.portion_label ? `Size: ${item.portion_label}` : '',
        `Qty: ${quantity}`,
        `Total: ${formatCurrency(lineTotal)}`,
      ].filter(Boolean);
      const notesText = item.notes ? `\nNote: ${item.notes}` : '';

      return `${index + 1}. ${item.name}\n${detailParts.join(' | ')}${notesText}`;
    })
    .join('\n\n');

  return {
    total,
    summary,
    countLabel: totalQuantity === 1 ? '1 item selected' : `${totalQuantity} items selected`,
    status:
      cartItems.length === 0
        ? ''
        : `${cartItems.length === 1 ? '1 item' : `${cartItems.length} items`} in cart • ${formatCurrency(total)}`,
  };
};

const buildCartReviewItems = async (restaurant: any, cartItems: FlowCartItem[]): Promise<FlowRadioOption[]> =>
  Promise.all(
    cartItems.map(async (item) => {
      const quantity = toPositiveInt(item.quantity, 1);
      const lineTotal = (parseFloat(item.unit_price) || 0) * quantity;
      const itemMatch = findItemWithCategory(restaurant, item.product_id);
      const descriptionParts = [
        item.portion_label ? `Size: ${item.portion_label}` : '',
        `Qty: ${quantity}`,
        `Total: ${formatCurrency(lineTotal)}`,
        item.notes ? `Note: ${normalizeText(item.notes, 40)}` : '',
      ].filter(Boolean);

      return {
        id: item.line_id,
        title: item.name,
        description: descriptionParts.join(' â€¢ '),
        image: await toFlowBase64Image(getItemPrimaryImage(itemMatch?.item), 'thumb'),
        'alt-text': item.name,
      };
    })
  );

const buildCartLine = (
  item: IMenuItem,
  category: IMenuCategory,
  portionId: string,
  quantity: number,
  notes: string
): FlowCartItem => {
  const selectedPortion = getSelectedPortion(item, category, portionId);
  return {
    line_id: `${getItemId(item)}_${selectedPortion.id}_${Math.random().toString(36).slice(2, 8)}`,
    product_id: getItemId(item),
    name: normalizeText(item.name, 80),
    portion_id: selectedPortion.id,
    portion_label: normalizeText(selectedPortion.name, 40),
    quantity: String(quantity),
    unit_price: String(selectedPortion.price),
    notes: normalizeText(notes, 140),
  };
};

const appendCartItem = (cartItems: FlowCartItem[], newItem: FlowCartItem): FlowCartItem[] => {
  const normalizedNotes = normalizeText(newItem.notes, 140).toLowerCase();
  const existingIndex = cartItems.findIndex(
    (entry) =>
      entry.product_id === newItem.product_id &&
      entry.portion_id === newItem.portion_id &&
      normalizeText(entry.notes, 140).toLowerCase() === normalizedNotes
  );

  if (existingIndex === -1) {
    return [...cartItems, newItem];
  }

  const updated = [...cartItems];
  const existingQuantity = toPositiveInt(updated[existingIndex].quantity, 1);
  const incomingQuantity = toPositiveInt(newItem.quantity, 1);
  updated[existingIndex] = {
    ...updated[existingIndex],
    quantity: String(existingQuantity + incomingQuantity),
  };
  return updated;
};

const findMenuCategory = (
  restaurant: any,
  selectedCategoryId: string,
  selectedCategoryName = ''
): IMenuCategory | null => {
  const categories = Array.isArray(restaurant.menu) ? restaurant.menu : [];
  return (
    categories.find(
      (category: IMenuCategory) =>
        category?._id?.toString() === selectedCategoryId ||
        category?.name === selectedCategoryId ||
        category?.name === selectedCategoryName
    ) ||
    categories.find(
      (category: IMenuCategory) =>
        Array.isArray(category?.items) && category.items.some((item: IMenuItem) => item?.isAvailable !== false)
    ) ||
    categories[0] ||
    null
  );
};

const findItemWithCategory = (
  restaurant: any,
  selectedItemId: string,
  categoryHint?: IMenuCategory | null
): { category: IMenuCategory; item: IMenuItem } | null => {
  const categories = Array.isArray(restaurant.menu) ? restaurant.menu : [];
  const searchSpace = categoryHint ? [categoryHint, ...categories.filter((entry: IMenuCategory) => entry !== categoryHint)] : categories;

  for (const category of searchSpace) {
    const item = (category.items || []).find(
      (entry: IMenuItem) =>
        entry?.isAvailable !== false &&
        (entry?._id?.toString() === selectedItemId || entry?.name === selectedItemId)
    );

    if (item) {
      return { category, item };
    }
  }

  return null;
};

const buildCategoriesResponse = async (restaurant: any) => {
  const categories = await Promise.all(
    (restaurant.menu || []).map(async (category: IMenuCategory) => ({
      id: getCategoryId(category),
      'main-content': {
        title: category.name,
        description: `${(category.items || []).filter((item: IMenuItem) => item?.isAvailable !== false).length} items`,
      },
      start: {
        image: await toFlowBase64Image(getCategoryImage(category)),
      },
          'on-click-action': {
            name: 'data_exchange',
            payload: {
              intent: 'load_items',
              selected_category_id: getCategoryId(category),
            },
          },
    }))
  );

  return {
    screen: 'CATEGORIES',
    data: {
      categories_list: categories,
    },
  };
};

const buildItemsResponse = async (
  category: IMenuCategory,
  cartItems: FlowCartItem[],
  screenHint = ''
) => {
  const availableItems = (category.items || []).filter((item: IMenuItem) => item?.isAvailable !== false);
  const cartPreview = buildCartPreview(cartItems);

  const itemOptions = await Promise.all(
    availableItems.map(async (item: IMenuItem): Promise<FlowRadioOption> => {
      const portionOptions = getPortionOptions(item, category);
      const startingPrice = Math.min(...portionOptions.map((option) => option.price));
      const descriptionParts = [
        normalizeText(item.description || 'Freshly prepared', 44),
        `From ${formatCurrency(startingPrice)}`,
      ].filter(Boolean);

      return {
        id: getItemId(item),
        title: item.name,
        description: descriptionParts.join(' • '),
        image: await toFlowBase64Image(getItemPrimaryImage(item)),
        'alt-text': item.name,
      };
    })
  );

  return {
    screen: 'ITEMS',
    data: {
      selected_category_id: getCategoryId(category),
      category_name: category.name,
      item_options: itemOptions,
      cart_items: cartItems,
      cart_has_items: cartItems.length > 0,
      cart_status: cartPreview.status,
      screen_hint: screenHint,
    },
  };
};

const buildItemDetailResponse = async (
  category: IMenuCategory,
  item: IMenuItem,
  cartItems: FlowCartItem[],
  state: {
    selectedPortionId?: string;
    selectedQuantity?: string;
    selectedNotes?: string;
    justAddedToCart?: boolean;
  }
) => {
  const portionOptions = getPortionOptions(item, category);
  const selectedPortion = getSelectedPortion(item, category, state.selectedPortionId || '');
  const selectedQuantity = String(Math.min(5, toPositiveInt(state.selectedQuantity, 1)));
  const selectedNotes = normalizeText(state.selectedNotes || '', 140);
  const total = selectedPortion.price * toPositiveInt(selectedQuantity, 1);
  const cartPreview = buildCartPreview(cartItems);
  const justAddedToCart = Boolean(state.justAddedToCart);
  const itemImageSources = getItemImageSources(item);
  const itemGallery: FlowCarouselImage[] = await Promise.all(
    (itemImageSources.length > 0 ? itemImageSources : ['']).map(async (imageSource, index) => ({
      src: await toFlowBase64Image(imageSource, 'detail'),
      'alt-text': itemImageSources.length > 1 ? `${item.name} ${index + 1}` : item.name,
    }))
  );

  return {
    screen: 'ITEM_DETAILS',
    data: {
      selected_category_id: getCategoryId(category),
      category_name: category.name,
      selected_item_id: getItemId(item),
      item_name: item.name,
      item_description: item.description || 'Freshly prepared just the way you like it.',
      item_image: itemGallery[0]?.src || DEFAULT_FLOW_IMAGE_BASE64,
      item_gallery: itemGallery,
      item_gallery_has_multiple: itemGallery.length > 1,
      item_gallery_hint: itemGallery.length > 1 ? 'Swipe to view more photos.' : '',
      item_price_hint:
        portionOptions.length > 1
          ? `Choose a portion. Prices start at ${formatCurrency(Math.min(...portionOptions.map((option) => option.price)))}`
          : `${formatCurrency(selectedPortion.price)} per serving`,
      portion_options: portionOptions.map((option) => ({
        id: option.id,
        title: `${option.name} • ${formatCurrency(option.price)}`,
        description: option.description || '',
      })),
      quantity_options: QUANTITY_OPTIONS,
      selected_portion_id: selectedPortion.id,
      selected_quantity: selectedQuantity,
      selected_notes: selectedNotes,
      live_total_label: `Total • ${formatCurrency(total)}`,
      cart_items: cartItems,
      cart_has_items: cartItems.length > 0,
      cart_status: cartPreview.status,
      just_added_to_cart: justAddedToCart,
      add_more_hint: justAddedToCart
        ? 'Added to cart. Tap back to pick another item, or review your cart when ready.'
        : '',
    },
  };
};

const buildCartResponse = async (
  restaurant: any,
  category: IMenuCategory | null,
  cartItems: FlowCartItem[]
) => {
  const cartPreview = buildCartPreview(cartItems);
  const cartReviewItems = await buildCartReviewItems(restaurant, cartItems);
  return {
    screen: 'CART',
    data: {
      selected_category_id: getCategoryId(category),
      category_name: category?.name || 'Menu',
      cart_items: cartItems,
      cart_review_items: cartReviewItems,
      cart_review_selection: cartReviewItems.map((item) => item.id),
      cart_has_items: cartItems.length > 0,
      cart_summary: cartPreview.summary || 'Your cart is empty. Use the back button to add an item.',
      cart_total_label: `Total • ${formatCurrency(cartPreview.total)}`,
      cart_count_label: cartPreview.countLabel,
    },
  };
};

const getCustomerPhone = (data: any): string =>
  coerceString(data?.customer_phone ?? data?.customerPhone ?? data?.phone ?? data?.phone_number);

const getFlowCustomer = async (restaurantId: any, data: any) => {
  const phoneNumber = getCustomerPhone(data);
  if (!phoneNumber) return null;

  return Customer.findOne({
    restaurantId,
    $or: [
      { phoneNumber },
      { phoneNumber: phoneNumber.replace(/\D/g, '') },
      { whatsappUserId: phoneNumber },
    ],
  });
};

const normalizeSavedAddress = (address: any, index: number) => ({
  id: String(index),
  title: address?.label || address?.name || `Address ${index + 1}`,
  description: [address?.flat, address?.address, address?.city, address?.pincode]
    .map((value) => coerceString(value))
    .filter(Boolean)
    .slice(0, 3)
    .join(' • '),
  label: coerceString(address?.label || address?.name),
  name: coerceString(address?.name),
  phoneNumber: coerceString(address?.phoneNumber),
  flat: coerceString(address?.flat),
  address: coerceString(address?.address),
  city: coerceString(address?.city),
  pincode: coerceString(address?.pincode),
  district: coerceString(address?.district),
  latitude: String(Number(address?.location?.latitude || 0)),
  longitude: String(Number(address?.location?.longitude || 0)),
});

const buildDeliveryAddressSummary = (address: any): string => {
  const lines = [
    address?.name ? `Name: ${address.name}` : '',
    address?.phoneNumber ? `Phone: ${address.phoneNumber}` : '',
    address?.flat ? `Flat: ${address.flat}` : '',
    address?.address ? `Address: ${address.address}` : '',
    [address?.city, address?.pincode].filter(Boolean).join(' - '),
  ].filter(Boolean);

  return lines.join('\n');
};

const buildCheckoutAddressSelectResponse = async (
  restaurant: any,
  cartItems: FlowCartItem[],
  customer: any
) => {
  const cartPreview = buildCartPreview(cartItems);
  const savedAddresses = Array.isArray(customer?.savedAddresses) ? customer.savedAddresses : [];
  const addressItems = savedAddresses.map((address: any, index: number) => normalizeSavedAddress(address, index));

  return {
    screen: 'CHECKOUT_ADDRESS_SELECT',
    data: {
      cart_items: cartItems,
      cart_status: cartPreview.status,
      cart_total_label: `Total • ${formatCurrency(cartPreview.total)}`,
      saved_address_items: addressItems,
      has_saved_addresses: addressItems.length > 0,
      selected_saved_address_index: '0',
      address_hint: addressItems.length > 0
        ? 'Choose a saved delivery address or add a new one.'
        : 'No saved addresses found. Add a new delivery address.',
    },
  };
};

const buildCheckoutAddressFormResponse = async (
  cartItems: FlowCartItem[],
  customer: any,
  prefillAddress: any = {}
) => {
  const cartPreview = buildCartPreview(cartItems);
  const fallbackName = coerceString(prefillAddress?.name || customer?.name);
  const fallbackPhone = coerceString(prefillAddress?.phoneNumber || customer?.deliveryPhoneNumber || customer?.phoneNumber);

  return {
    screen: 'CHECKOUT_ADDRESS_FORM',
    data: {
      cart_items: cartItems,
      cart_status: cartPreview.status,
      cart_total_label: `Total • ${formatCurrency(cartPreview.total)}`,
      name: fallbackName,
      phone_number: fallbackPhone,
      flat: coerceString(prefillAddress?.flat),
      address: coerceString(prefillAddress?.address || customer?.address),
      city: coerceString(prefillAddress?.city || customer?.city),
      pincode: coerceString(prefillAddress?.pincode || customer?.pincode),
      district: coerceString(prefillAddress?.district || customer?.district),
      location_note: coerceString(prefillAddress?.location_note),
    },
  };
};

const buildCheckoutConfirmResponse = async (
  cartItems: FlowCartItem[],
  deliveryAddress: any
) => {
  const cartPreview = buildCartPreview(cartItems);
  return {
    screen: 'CHECKOUT_CONFIRM',
    data: {
      cart_items: cartItems,
      cart_summary: cartPreview.summary || 'Your cart is ready for checkout.',
      cart_total_label: `Total • ${formatCurrency(cartPreview.total)}`,
      delivery_address: deliveryAddress,
      delivery_address_summary: buildDeliveryAddressSummary(deliveryAddress),
    },
  };
};

const findRestaurantForFlow = async (req: Request, flowToken: string) => {
  let restaurant: any = null;
  const partnerTenantIdHeader = req.headers['x-partner-tenant-id'] as string;

  if (partnerTenantIdHeader) {
    console.log(`[Flow] Identifying store by header X-Partner-Tenant-Id: ${partnerTenantIdHeader}`);
    if (WAYO_TENANT_IDS.includes(partnerTenantIdHeader)) {
      restaurant = await Restaurant.findOne({ marketingOsTenantId: { $in: WAYO_TENANT_IDS } });
    } else {
      restaurant = await Restaurant.findOne({ marketingOsTenantId: partnerTenantIdHeader });
    }
  }

  if (!restaurant && flowToken && flowToken.match(/^[0-9a-fA-F]{24}$/)) {
    restaurant = await Restaurant.findById(flowToken);
    console.log(`[Flow] [Lookup] By ID: ${flowToken} -> ${restaurant ? restaurant.name : 'NOT FOUND'}`);
  }

  if (!restaurant) {
    restaurant = await Restaurant.findOne({ isActive: true, 'menu.0': { $exists: true } });
    if (restaurant) {
      console.log(`[Flow] [Lookup] By menu availability -> ${restaurant.name}`);
    } else {
      restaurant = await Restaurant.findOne({ isActive: true });
      console.log(`[Flow] [Lookup] By default (isActive:true) -> ${restaurant ? restaurant.name : 'NOT FOUND'}`);
    }
  }

  return restaurant;
};

export const handleFlowRequest = async (req: Request, res: Response) => {
  console.log(`[Flow] [${req.method}] ${req.path} Arrived.`);
  console.log('[Flow] Request arrived at endpoint.');

  try {
    let body = req.body;

    if (!body?.encrypted_flow_data && body?.entry?.[0]?.changes?.[0]?.value?.encrypted_flow_data) {
      console.log('[Flow] Detected nested Flow payload in Meta webhook format.');
      body = body.entry[0].changes[0].value;
    }

    const { action, encrypted_flow_data, encrypted_aes_key, initial_vector } = body;

    if (action === 'ping') {
      console.log('[Flow] [PING] Received unencrypted health check.');
      return res.json({ data: { status: 'active' } });
    }

    if (!encrypted_flow_data || !encrypted_aes_key || !initial_vector) {
      console.warn('[Flow] Missing encrypted payloads in request. Fields provided:', Object.keys(body));
      return res.status(400).send('Missing encrypted payloads');
    }

    console.log('[Flow] Attempting decryption...');
    const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptFlowRequest(
      encrypted_aes_key,
      encrypted_flow_data,
      initial_vector
    );

    console.log('[Flow] Decrypted Body Payload:', JSON.stringify(decryptedBody, null, 2));

    const { action: flowAction, screen, data, flow_token } = decryptedBody;
    const transportAction = (flowAction || '').toUpperCase();
    const payloadIntent = coerceString(
      data?.intent ?? data?.request_type ?? data?.event_name ?? data?.action
    ).toUpperCase();
    const normalizedAction = payloadIntent || transportAction || 'INIT';

    if (normalizedAction === 'PING') {
      const response = { data: { status: 'active' } };
      const encryptedResponse = encryptFlowResponse(response, aesKeyBuffer, initialVectorBuffer);
      return res.send(encryptedResponse);
    }

    console.log(`[Flow] [${normalizedAction}] Screen: ${screen}, Token: ${flow_token}`);

    const restaurant = await findRestaurantForFlow(req, flow_token);
    if (!restaurant) {
      console.error(`[Flow] [Error] Restaurant lookup failed for token: ${flow_token}`);
      return res.status(404).send('Restaurant not found');
    }

    const selectedCategoryId = coerceString(data?.selected_category_id ?? data?.selectedCategoryId);
    const selectedCategoryName = coerceString(data?.category_name);
    const selectedItemId = coerceString(data?.selected_item_id ?? data?.selectedItemId);
    const selectedPortionId = coerceString(data?.portion ?? data?.selected_portion_id);
    const selectedQuantity = coerceString(data?.quantity ?? data?.selected_quantity);
    const selectedNotes = coerceString(data?.notes ?? data?.selected_notes);
    const cartItems = normalizeCartItems(data?.cart_items);
    const customer = await getFlowCustomer(restaurant._id, data);
    const hasComponentValidationError = data?.error === 'components-validation-error';
    const validationErrorMessage = String(data?.error_message || '');
    const missingCategoriesList =
      hasComponentValidationError && validationErrorMessage.includes('"categories_list"');
    const selectedSavedAddressIndex = Number.parseInt(coerceString(data?.selected_saved_address_index ?? data?.saved_address_index), 10);

    let responseData: any;

    const inferredItemDetailAction =
      screen === 'ITEMS' && Boolean(selectedItemId)
        ? 'LOAD_ITEM_DETAIL'
        : screen === 'ITEM_DETAILS' && normalizedAction === 'DATA_EXCHANGE'
          ? 'REFRESH_ITEM_DETAIL'
          : '';
    const effectiveAction = inferredItemDetailAction || normalizedAction;

    if (
      effectiveAction === 'LOAD_ITEM_DETAIL' ||
      effectiveAction === 'REFRESH_ITEM_DETAIL' ||
      effectiveAction === 'ADD_TO_CART'
    ) {
      const categoryHint = findMenuCategory(restaurant, selectedCategoryId, selectedCategoryName);
      const itemMatch = findItemWithCategory(restaurant, selectedItemId, categoryHint);

      if (!itemMatch) {
        console.warn(`[Flow] [${effectiveAction}] Item not found for id='${selectedItemId}'. Returning item list.`);
        responseData = categoryHint
          ? await buildItemsResponse(categoryHint, cartItems)
          : await buildCategoriesResponse(restaurant);
      } else if (effectiveAction === 'ADD_TO_CART') {
        const cartLine = buildCartLine(
          itemMatch.item,
          itemMatch.category,
          selectedPortionId,
          Math.min(5, toPositiveInt(selectedQuantity, 1)),
          selectedNotes
        );
        const updatedCart = appendCartItem(cartItems, cartLine);
        const addedLabel = cartLine.portion_label
          ? `${cartLine.name} (${cartLine.portion_label})`
          : cartLine.name;
        responseData = await buildItemsResponse(
          itemMatch.category,
          updatedCart,
          `Added ${addedLabel} x${cartLine.quantity} to cart.`
        );
      } else {
        responseData = await buildItemDetailResponse(itemMatch.category, itemMatch.item, cartItems, {
          selectedPortionId,
          selectedQuantity,
          selectedNotes,
        });
      }

      const encryptedResponse = encryptFlowResponse(responseData, aesKeyBuffer, initialVectorBuffer);
      return res.send(encryptedResponse);
    }

    if (effectiveAction === 'REVIEW_CART') {
      const category = findMenuCategory(restaurant, selectedCategoryId, selectedCategoryName);
      responseData = await buildCartResponse(restaurant, category, cartItems);
      const encryptedResponse = encryptFlowResponse(responseData, aesKeyBuffer, initialVectorBuffer);
      return res.send(encryptedResponse);
    }

    if (effectiveAction === 'CHECKOUT') {
      responseData = customer && Array.isArray(customer.savedAddresses) && customer.savedAddresses.length > 0
        ? await buildCheckoutAddressSelectResponse(restaurant, cartItems, customer)
        : await buildCheckoutAddressFormResponse(cartItems, customer, {});

      const encryptedResponse = encryptFlowResponse(responseData, aesKeyBuffer, initialVectorBuffer);
      return res.send(encryptedResponse);
    }

    if (effectiveAction === 'SELECT_SAVED_ADDRESS') {
      const savedAddresses = Array.isArray(customer?.savedAddresses) ? customer.savedAddresses : [];
      const selectedAddress = savedAddresses[selectedSavedAddressIndex] || savedAddresses[0];

      if (!selectedAddress) {
        responseData = await buildCheckoutAddressFormResponse(cartItems, customer, {});
      } else {
        const deliveryAddress = {
          label: coerceString(selectedAddress.label || selectedAddress.name),
          name: coerceString(selectedAddress.name || customer?.name),
          phoneNumber: coerceString(selectedAddress.phoneNumber || customer?.deliveryPhoneNumber || customer?.phoneNumber),
          flat: coerceString(selectedAddress.flat),
          address: coerceString(selectedAddress.address),
          city: coerceString(selectedAddress.city),
          pincode: coerceString(selectedAddress.pincode),
          district: coerceString(selectedAddress.district),
          latitude: Number(selectedAddress.location?.latitude || 0),
          longitude: Number(selectedAddress.location?.longitude || 0),
        };
        responseData = await buildCheckoutConfirmResponse(cartItems, deliveryAddress);
      }

      const encryptedResponse = encryptFlowResponse(responseData, aesKeyBuffer, initialVectorBuffer);
      return res.send(encryptedResponse);
    }

    if (effectiveAction === 'START_NEW_ADDRESS') {
      responseData = await buildCheckoutAddressFormResponse(cartItems, customer, {});
      const encryptedResponse = encryptFlowResponse(responseData, aesKeyBuffer, initialVectorBuffer);
      return res.send(encryptedResponse);
    }

    if (effectiveAction === 'SUBMIT_NEW_ADDRESS') {
      const deliveryAddress = {
        label: coerceString(data?.label || data?.name),
        name: coerceString(data?.name || customer?.name),
        phoneNumber: coerceString(data?.phone_number || data?.phoneNumber || customer?.deliveryPhoneNumber || customer?.phoneNumber),
        flat: coerceString(data?.flat),
        address: coerceString(data?.address),
        city: coerceString(data?.city),
        pincode: coerceString(data?.pincode),
        district: coerceString(data?.district),
        location_note: coerceString(data?.location_note),
      };

      responseData = await buildCheckoutConfirmResponse(cartItems, deliveryAddress);
      const encryptedResponse = encryptFlowResponse(responseData, aesKeyBuffer, initialVectorBuffer);
      return res.send(encryptedResponse);
    }

    const shouldLoadItems =
      effectiveAction === 'LOAD_ITEMS' ||
      (effectiveAction === 'DATA_EXCHANGE' && Boolean(selectedCategoryId) && !selectedItemId && !missingCategoriesList);

    if (shouldLoadItems) {
      const category = findMenuCategory(restaurant, selectedCategoryId, selectedCategoryName);
      if (!category) {
        responseData = await buildCategoriesResponse(restaurant);
      } else {
        responseData = await buildItemsResponse(category, cartItems);
      }

      const itemsJson = JSON.stringify(responseData.data);
      console.log(`[Flow] [DEBUG] ITEMS_RESPONSE_SIZE: ${itemsJson.length} chars (Approx ${Math.round(itemsJson.length / 1024)} KB)`);

      const encryptedResponse = encryptFlowResponse(responseData, aesKeyBuffer, initialVectorBuffer);
      return res.send(encryptedResponse);
    }

    const shouldLoadCategories =
      effectiveAction === 'INIT' ||
      effectiveAction === 'DATA_EXCHANGE' ||
      effectiveAction === 'SELECT_CATEGORY' ||
      missingCategoriesList;

    if (shouldLoadCategories) {
      responseData = await buildCategoriesResponse(restaurant);
      const categoriesJson = JSON.stringify(responseData.data);
      console.log(`[Flow] [DEBUG] CATEGORIES_RESPONSE_SIZE: ${categoriesJson.length} chars (Approx ${Math.round(categoriesJson.length / 1024)} KB)`);

      const encryptedResponse = encryptFlowResponse(responseData, aesKeyBuffer, initialVectorBuffer);
      console.log(`[Flow] [${effectiveAction}] Sending encrypted response.`);
      return res.send(encryptedResponse);
    }

    console.warn(`[Flow] [Warning] Received unsupported action: ${effectiveAction}`);
    return res.status(400).send('Unsupported action');
  } catch (error: any) {
    console.error('[Flow] [CRITICAL ERROR]:', error);
    if (!res.headersSent) {
      return res.status(500).send('Internal Server Error');
    }
  }
};
