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
