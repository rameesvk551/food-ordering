import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';

export interface IMenuItem {
  _id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isAvailable: boolean;
}

export interface IMenuCategory {
  _id?: string;
  name: string;
  items: IMenuItem[];
}

export interface IRestaurant extends Document {
  name: string;
  slug: string;
  phoneNumber: string;
  whatsappBusinessAccountId: string;
  whatsappPhoneNumberId: string;
  whatsappCatalogId: string;
  accessToken: string;
  menu: IMenuCategory[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  image: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true },
});

const menuCategorySchema = new Schema<IMenuCategory>({
  name: { type: String, required: true },
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
