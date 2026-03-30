import { useCart } from '../../context/CartContext';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import Button from '../ui/Button';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

const CartDrawer = ({ isOpen, onClose, onCheckout }: CartDrawerProps) => {
  const { items, updateQuantity, totalAmount, totalItems } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#171c24] to-[#10151c] rounded-t-3xl border-t border-[#3a4350] shadow-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#4a5361] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#343c49]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#262f3a] border border-[#424d5c] rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#f2a63a]" />
            </div>
            <div>
              <h3 className="font-bold text-[#f6ede0] text-lg">Your Cart</h3>
              <p className="text-xs text-[#8f8578]">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#252c36] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-[#9d9180]" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-[#8f8578] mx-auto mb-3" />
              <p className="text-[#d9cbb6] font-medium">Your cart is empty</p>
              <p className="text-[#8f8578] text-sm mt-1">Add items from the menu</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex items-center gap-4 py-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[#f6ede0] text-sm truncate">{item.name}</h4>
                  <p className="text-[#f2a63a] font-bold text-sm">₹{item.price * item.quantity}</p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2 bg-[#1b212b] border border-[#323b48] rounded-xl p-1">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-[#262e3a] shadow-sm flex items-center justify-center
                      hover:bg-[#2f3947] transition-colors btn-press cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5 text-[#d9cbb6]" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-[#f6ede0]">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-[#262e3a] shadow-sm flex items-center justify-center
                      hover:bg-[#2f3947] transition-colors btn-press cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#d9cbb6]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-[#343c49] bg-[#131821]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#b6a896] font-medium">Total</span>
              <span className="text-2xl font-bold text-[#f6ede0]">₹{totalAmount}</span>
            </div>
            <Button onClick={onCheckout} className="w-full" size="lg" variant="accent">
              Place Order • ₹{totalAmount}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
