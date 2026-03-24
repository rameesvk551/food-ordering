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
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-lg">Your Cart</h3>
              <p className="text-xs text-text-muted">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary font-medium">Your cart is empty</p>
              <p className="text-text-muted text-sm mt-1">Add items from the menu</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex items-center gap-4 py-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-text-primary text-sm truncate">{item.name}</h4>
                  <p className="text-primary-600 font-bold text-sm">₹{item.price * item.quantity}</p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center
                      hover:bg-gray-50 transition-colors btn-press cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5 text-text-secondary" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-text-primary">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center
                      hover:bg-gray-50 transition-colors btn-press cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-text-secondary" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-border bg-surface-secondary">
            <div className="flex justify-between items-center mb-4">
              <span className="text-text-secondary font-medium">Total</span>
              <span className="text-2xl font-bold text-text-primary">₹{totalAmount}</span>
            </div>
            <Button onClick={onCheckout} className="w-full" size="lg">
              Place Order • ₹{totalAmount}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
