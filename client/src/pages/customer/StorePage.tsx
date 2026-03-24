import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../components/ui/Toast';
import CartDrawer from '../../components/customer/CartDrawer';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { MenuCardSkeleton } from '../../components/ui/Skeleton';
import {
  ShoppingBag, Plus, UtensilsCrossed, Phone, ChevronDown,
} from 'lucide-react';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isAvailable: boolean;
}

interface MenuCategory {
  _id: string;
  name: string;
  items: MenuItem[];
}

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  menu: MenuCategory[];
}

const StorePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem, totalItems, totalAmount, items: cartItems, clearCart } = useCart();
  const { showToast } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const [customerInfo, setCustomerInfo] = useState({
    name: '', phone: '', address: '', city: '', pincode: '',
  });

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await api.get(`/store/${slug}`);
        setRestaurant(res.data.restaurant);
      } catch (err: any) {
        if (err.response?.status === 404) setNotFound(true);
        else showToast('Failed to load restaurant', 'error');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchStore();
  }, [slug]);

  const filteredItems = useMemo(() => {
    if (!restaurant) return [];
    if (selectedCategory === 'all') {
      return restaurant.menu.flatMap((cat) =>
        cat.items.filter((i) => i.isAvailable).map((item) => ({ ...item, category: cat.name }))
      );
    }
    const cat = restaurant.menu.find((c) => c._id === selectedCategory);
    return cat ? cat.items.filter((i) => i.isAvailable).map((item) => ({ ...item, category: cat.name })) : [];
  }, [restaurant, selectedCategory]);

  const handleAddToCart = (item: MenuItem) => {
    addItem({ productId: item._id, name: item.name, price: item.price, image: item.image });
    setAddedItems((prev) => new Set(prev).add(item._id));
    setTimeout(() => {
      setAddedItems((prev) => {
        const next = new Set(prev);
        next.delete(item._id);
        return next;
      });
    }, 600);
  };

  const handleCheckout = () => {
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const handlePlaceOrder = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      showToast('Please enter your name and phone number', 'error');
      return;
    }
    setPlacing(true);
    try {
      await api.post(`/store/${slug}/order`, {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        address: customerInfo.address,
        city: customerInfo.city,
        pincode: customerInfo.pincode,
        items: cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });
      clearCart();
      setCheckoutOpen(false);
      navigate(`/${slug}/success`);
    } catch {
      showToast('Failed to place order. Please try again.', 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-50">
        <div className="skeleton h-52 w-full rounded-none" />
        <div className="max-w-4xl mx-auto p-4 space-y-4 mt-4">
          <div className="skeleton h-10 w-48" />
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <MenuCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="text-center">
          <UtensilsCrossed className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Restaurant Not Found</h2>
          <p className="text-text-secondary">This restaurant page doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50 pb-24">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <UtensilsCrossed className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold">{restaurant.name}</h1>
              {restaurant.phoneNumber && (
                <p className="text-primary-100 text-xs md:text-sm flex items-center gap-1 mt-0.5 md:mt-1">
                  <Phone className="w-3.5 h-3.5" />
                  {restaurant.phoneNumber}
                </p>
              )}
            </div>
          </div>
          <p className="text-primary-100 mt-3 md:mt-4 text-base md:text-lg">Order delicious food online</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-6">
        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sticky top-16 lg:top-0 z-10 bg-transparent pt-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-200 btn-press shadow-sm cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-primary-500 text-white shadow-primary-500/30'
                : 'bg-white text-text-secondary hover:bg-gray-50 border border-border'
            }`}
          >
            All Items
          </button>
          {restaurant.menu.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`px-4 py-2 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-200 btn-press shadow-sm cursor-pointer ${
                selectedCategory === cat._id
                  ? 'bg-primary-500 text-white shadow-primary-500/30'
                  : 'bg-white text-text-secondary hover:bg-gray-50 border border-border'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-border mt-4">
            <UtensilsCrossed className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary font-medium">No items available</p>
          </div>
        ) : (
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mt-2">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden
                  hover:shadow-md transition-all duration-300 group flex sm:flex-col"
              >
                {item.image ? (
                  <div className="relative overflow-hidden w-24 h-24 sm:w-full sm:h-40 shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 sm:w-full sm:h-40 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="w-8 h-8 sm:w-10 sm:h-10 text-primary-300" />
                  </div>
                )}
                <div className="p-3 md:p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-text-primary text-sm md:text-base mb-0.5 truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-text-muted line-clamp-1 sm:line-clamp-2 mb-2">{item.description}</p>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-auto">
                    <span className="text-base md:text-lg font-bold text-primary-600">₹{item.price}</span>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-300 btn-press cursor-pointer ${
                        addedItems.has(item._id)
                          ? 'bg-accent-500 text-white animate-bounce-in scale-110'
                          : 'bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-500/25'
                      }`}
                    >
                      <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Cart Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full max-w-4xl mx-auto bg-primary-500 hover:bg-primary-600 text-white
              rounded-2xl py-4 px-6 flex items-center justify-between shadow-2xl
              shadow-primary-500/30 transition-all duration-200 btn-press cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-bold">
                {totalItems} item{totalItems !== 1 ? 's' : ''} added
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">₹{totalAmount}</span>
              <ChevronDown className="w-5 h-5 rotate-180" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} onCheckout={handleCheckout} />

      {/* Checkout Modal */}
      <Modal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Checkout" size="lg">
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="Your name"
            value={customerInfo.name}
            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
            required
          />
          <Input
            label="Phone Number"
            placeholder="+91 9876543210"
            value={customerInfo.phone}
            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
            required
          />
          <Input
            label="Address"
            placeholder="Delivery address"
            value={customerInfo.address}
            onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="City"
              value={customerInfo.city}
              onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })}
            />
            <Input
              label="Pincode"
              placeholder="560001"
              value={customerInfo.pincode}
              onChange={(e) => setCustomerInfo({ ...customerInfo, pincode: e.target.value })}
            />
          </div>

          {/* Order Summary */}
          <div className="bg-surface-secondary rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-text-primary text-sm mb-2">Order Summary</h4>
            {cartItems.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="text-text-secondary">{item.quantity}x {item.name}</span>
                <span className="font-medium">₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-border flex justify-between">
              <span className="font-bold text-text-primary">Total</span>
              <span className="font-bold text-primary-600 text-lg">₹{totalAmount}</span>
            </div>
          </div>

          <Button onClick={handlePlaceOrder} loading={placing} className="w-full" size="lg">
            Confirm Order • ₹{totalAmount}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default StorePage;
