import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  phoneNumber: string;
  restaurantId: mongoose.Types.ObjectId;
  whatsappUserId: string;
  pincode: string;
  city: string;
  district: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, default: '' },
    phoneNumber: { type: String, required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    whatsappUserId: { type: String, default: '' },
    pincode: { type: String, default: '' },
    city: { type: String, default: '' },
    district: { type: String, default: '' },
    address: { type: String, default: '' },
    location: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

customerSchema.index({ phoneNumber: 1, restaurantId: 1 }, { unique: true });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
