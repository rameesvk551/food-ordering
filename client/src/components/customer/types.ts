export interface DiscoverRestaurant {
  id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  whatsappUrl: string;
}

export interface DiscoverItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  restaurant: DiscoverRestaurant;
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
  isAvailable: boolean;
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
  menu: MenuCategory[];
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
}
