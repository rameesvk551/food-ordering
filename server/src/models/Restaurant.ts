import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';

export interface IMenuItem {
  _id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  images?: string[];
  isAvailable: boolean;
  portionOptions?: IMenuPortionOption[];
}

export interface IMenuCategory {
  _id?: string;
  name: string;
  image?: string;
  items: IMenuItem[];
}

export interface IMenuPortionOption {
  id: string;
  name: string;
  price: number;
  description?: string;
  isDefault?: boolean;
}

export interface IRestaurant extends Document {
  name: string;
  slug: string;
  phoneNumber: string;
  whatsappBusinessAccountId: string;
  whatsappPhoneNumberId: string;
  whatsappCatalogId: string;
  whatsappFlowId?: string;
  marketingOsTenantId?: string;
  accessToken: string;
  menu: IMenuCategory[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  email?: string;
  images?: string[];
  logo?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  cuisineTypes?: string[];
  businessHours?: {
    [key: string]: IBusinessHours;
  };
  minDeliveryTime?: number;
  maxDeliveryTime?: number;
  minOrderValue?: number;
  deliveryCharges?: number;
}

export interface IBusinessHours {
  open: string;
  close: string;
  isClosed: boolean;
}

export interface IRestaurantSettings {
  description?: string;
  email?: string;
  images?: string[];
  logo?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  cuisineTypes?: string[];
  businessHours?: {
    [key: string]: IBusinessHours;
  };
  minDeliveryTime?: number;
  maxDeliveryTime?: number;
  minOrderValue?: number;
  deliveryCharges?: number;
}
const menuPortionOptionSchema = new Schema<IMenuPortionOption>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const menuItemSchema = new Schema<IMenuItem>({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, default: '' },
  images: { type: [String], default: [] },
  isAvailable: { type: Boolean, default: true },
  portionOptions: { type: [menuPortionOptionSchema], default: [] },
});

const menuCategorySchema = new Schema<IMenuCategory>({
  name: { type: String, required: true },
  image: { type: String, default: '' },
  items: [menuItemSchema],
});

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    phoneNumber: { type: String, default: '' },
    whatsappBusinessAccountId: { type: String, default: '' },
    whatsappPhoneNumberId: { type: String, default: '', index: true },
    whatsappCatalogId: { type: String, default: '' },
    whatsappFlowId: { type: String, default: '' },
    marketingOsTenantId: { type: String, default: '', index: true },
    accessToken: { type: String, default: '' },
    menu: [menuCategorySchema],
    isActive: { type: Boolean, default: true },
   description: { type: String, default: '' },
   email: { type: String, default: '' },
   images: { type: [String], default: [] },
   logo: { type: String, default: '' },
   address: { type: String, default: '' },
   city: { type: String, default: '' },
   state: { type: String, default: '' },
   zipCode: { type: String, default: '' },
   latitude: { type: Number, default: 0 },
   longitude: { type: Number, default: 0 },
   cuisineTypes: { type: [String], default: [] },
   businessHours: {
     type: Map,
     of: {
       open: { type: String, default: '09:00' },
       close: { type: String, default: '23:00' },
       isClosed: { type: Boolean, default: false },
     },
     default: () => ({
       Monday: { open: '09:00', close: '23:00', isClosed: false },
       Tuesday: { open: '09:00', close: '23:00', isClosed: false },
       Wednesday: { open: '09:00', close: '23:00', isClosed: false },
       Thursday: { open: '09:00', close: '23:00', isClosed: false },
       Friday: { open: '09:00', close: '23:00', isClosed: false },
       Saturday: { open: '10:00', close: '00:00', isClosed: false },
       Sunday: { open: '10:00', close: '23:00', isClosed: false },
     }),
   },
   minDeliveryTime: { type: Number, default: 30 },
   maxDeliveryTime: { type: Number, default: 60 },
   minOrderValue: { type: Number, default: 0 },
   deliveryCharges: { type: Number, default: 0 },
  },
  { timestamps: true }
);

restaurantSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
