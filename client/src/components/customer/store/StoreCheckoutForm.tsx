import type { CartItem } from '../../../context/CartContext';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import type { CustomerInfo } from '../types';

interface StoreCheckoutFormProps {
  customerInfo: CustomerInfo;
  cartItems: CartItem[];
  totalAmount: number;
  placing: boolean;
  onFieldChange: (field: keyof CustomerInfo, value: string) => void;
  onPlaceOrder: () => void;
}

const StoreCheckoutForm = ({
  customerInfo,
  cartItems,
  totalAmount,
  placing,
  onFieldChange,
  onPlaceOrder,
}: StoreCheckoutFormProps) => {
  return (
    <div className="space-y-4">
      <Input
        label="Name"
        placeholder="Your name"
        value={customerInfo.name}
        onChange={(event) => onFieldChange('name', event.target.value)}
        required
      />
      <Input
        label="Phone Number"
        placeholder="+91 9876543210"
        value={customerInfo.phone}
        onChange={(event) => onFieldChange('phone', event.target.value)}
        required
      />
      <Input
        label="Address"
        placeholder="Delivery address"
        value={customerInfo.address}
        onChange={(event) => onFieldChange('address', event.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="City"
          placeholder="City"
          value={customerInfo.city}
          onChange={(event) => onFieldChange('city', event.target.value)}
        />
        <Input
          label="Pincode"
          placeholder="560001"
          value={customerInfo.pincode}
          onChange={(event) => onFieldChange('pincode', event.target.value)}
        />
      </div>

      <div className="bg-[#11161e] border border-[#343c49] rounded-xl p-4 space-y-2">
        <h4 className="font-bold text-[#f6ede0] text-sm mb-2">Order Summary</h4>
        {cartItems.map((item) => (
          <div key={item.cartKey} className="flex justify-between text-sm">
            <span className="text-[#b8aa96]">
              {item.quantity}x {item.name}{item.portionName ? ` (${item.portionName})` : ''}
            </span>
            <span className="font-medium text-[#f6ede0]">Rs.{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="pt-2 mt-2 border-t border-[#343c49] flex justify-between">
          <span className="font-bold text-[#f6ede0]">Total</span>
          <span className="font-bold text-[#f2a63a] text-lg">Rs.{totalAmount}</span>
        </div>
      </div>

      <Button onClick={onPlaceOrder} loading={placing} className="w-full" size="lg" variant="accent">
        Confirm Order - Rs.{totalAmount}
      </Button>
    </div>
  );
};

export default StoreCheckoutForm;
