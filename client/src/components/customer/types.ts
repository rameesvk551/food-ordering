export interface DiscoverRestaurant {
  id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  whatsappUrl: string;
  logo?: string;
  coverImage?: string;
}

export interface DiscoverItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  portionOptions?: MenuPortionOption[];
  category: string;
  restaurant: DiscoverRestaurant;
}

export interface MenuPortionOption {
  id: string;
  name: string;
  price: number;
  description?: string;
  isDefault?: boolean;
}

export interface DiscoverCategoryCardData {
  name: string;
  image: string;
  startingPrice: number;
}

export interface DiscoverRestaurantCardData extends DiscoverRestaurant {
  coverImage: string;
  spotlightText: string;
  rating: number;
  deliveryMinutes: number;
  categories: string[];
  itemsCount: number;
}

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  isAvailable: boolean;
  portionOptions?: MenuPortionOption[];
}

export interface DisplayMenuItem extends MenuItem {
  category: string;
}

export interface MenuCategory {
  _id: string;
  name: string;
  items: MenuItem[];
}

export interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  description?: string;
  images?: string[];
  logo?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  cuisineTypes?: string[];
  businessHours?: Record<string, { open: string; close: string; isClosed: boolean }>;
  minDeliveryTime?: number;
  maxDeliveryTime?: number;
  minOrderValue?: number;
  deliveryCharges?: number;
  menu: MenuCategory[];
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
}
