import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'completed' | 'cancelled';
export type OrderSource = 'whatsapp' | 'web';

export interface IOrder extends Document {
  restaurantId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  source: OrderSource;
  customerName: string;
  customerPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'completed', 'cancelled'],
      default: 'pending',
    },
    source: {
      type: String,
      enum: ['whatsapp', 'web'],
      required: true,
    },
    customerName: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
  },
  { timestamps: true }
);

orderSchema.index({ restaurantId: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
