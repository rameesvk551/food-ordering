import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerSavedAddress {
  label: string;
  name: string;
  phoneNumber: string;
  flat: string;
  address: string;
  city: string;
  pincode: string;
  district: string;
  location: {
    latitude: number;
    longitude: number;
  };
  isDefault: boolean;
  lastUsedAt?: Date;
}

export interface ICustomer extends Document {
  name: string;
  phoneNumber: string;
  deliveryPhoneNumber: string;
  restaurantId: mongoose.Types.ObjectId;
  whatsappUserId: string;
  whatsappFlowState: string;
  whatsappCart: any[];
  cartUpdatedAt: Date;
  whatsappAddressDraft: Record<string, any>;
  savedAddresses: ICustomerSavedAddress[];
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

const savedAddressSchema = new Schema<ICustomerSavedAddress>(
  {
    label: { type: String, default: '' },
    name: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    flat: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    pincode: { type: String, default: '' },
    district: { type: String, default: '' },
    location: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
    },
    isDefault: { type: Boolean, default: false },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, default: '' },
    phoneNumber: { type: String, required: true },
    deliveryPhoneNumber: { type: String, default: '' },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    whatsappUserId: { type: String, default: '' },
    whatsappFlowState: { type: String, default: 'idle' },
    whatsappCart: { type: Schema.Types.Mixed, default: [] },
    cartUpdatedAt: { type: Date, default: Date.now },
    whatsappAddressDraft: { type: Schema.Types.Mixed, default: {} },
    savedAddresses: { type: [savedAddressSchema], default: [] },
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
