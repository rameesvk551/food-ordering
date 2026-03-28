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
  ShoppingBag, Plus, UtensilsCrossed, ChevronDown, ArrowLeft, Ellipsis, Star, Bike, Clock3,
} from 'lucide-react';

interface DisplayMenuItem extends MenuItem {
  category: string;
}

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

  const filteredItems = useMemo<DisplayMenuItem[]>(() => {
    if (!restaurant) return [];

    if (selectedCategory === 'all') {
      return restaurant.menu.flatMap((cat) =>
        cat.items
          .filter((i) => i.isAvailable)
          .map((item) => ({ ...item, category: cat.name }))
      );
    }
    const cat = restaurant.menu.find((c) => c._id === selectedCategory);
    return cat
      ? cat.items
        .filter((i) => i.isAvailable)
        .map((item) => ({ ...item, category: cat.name }))
      : [];
  }, [restaurant, selectedCategory]);

  const availableItemCount = useMemo(() => {
    if (!restaurant) return 0;
    return restaurant.menu.reduce(
      (count, category) => count + category.items.filter((item) => item.isAvailable).length,
      0
    );
  }, [restaurant]);

  const coverImage = useMemo(() => {
    if (!restaurant) return '';
    for (const category of restaurant.menu) {
      const itemWithImage = category.items.find((item) => item.isAvailable && item.image);
      if (itemWithImage?.image) return itemWithImage.image;
    }
    return 'https://images.unsplash.com/photo-1541544181051-e46607c79d22?auto=format&fit=crop&w=1400&q=80';
  }, [restaurant]);

  const selectedCategoryName = useMemo(() => {
    if (!restaurant || selectedCategory === 'all') return 'Popular Picks';
    return restaurant.menu.find((category) => category._id === selectedCategory)?.name || 'Popular Picks';
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
    <div className="min-h-screen bg-[#dde1e6] py-4 px-2 md:px-4">
      <div className="max-w-md mx-auto bg-[#f7f7f7] min-h-[calc(100vh-2rem)] rounded-[2rem] shadow-[0_20px_60px_rgba(15,23,42,0.18)] overflow-hidden pb-24">
        <div className="px-4 pt-4">
          <div className="relative">
            <img src={coverImage} alt={restaurant.name} className="w-full h-56 object-cover rounded-2xl" />
            <button
              type="button"
              onClick={() => navigate('/')}
              className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/95 text-[#1f2937] flex items-center justify-center shadow"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/95 text-[#1f2937] flex items-center justify-center shadow"
            >
              <Ellipsis className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        <div className="px-4 pt-3">
          <div className="flex items-center gap-4 text-[13px] text-[#4b5563]">
            <span className="inline-flex items-center gap-1 font-semibold text-[#f97316]">
              <Star className="w-3.5 h-3.5 fill-[#f97316] text-[#f97316]" />
              4.7
            </span>
            <span className="inline-flex items-center gap-1">
              <Bike className="w-3.5 h-3.5 text-[#f97316]" />
              Free
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="w-3.5 h-3.5 text-[#f97316]" />
              20 min
            </span>
          </div>

          <h1 className="text-[33px] font-black text-[#1f2937] leading-tight mt-2">{restaurant.name}</h1>
          <p className="text-[12px] leading-5 text-[#8b95a7] mt-1">
            Freshly prepared favorites and chef specials. Choose your category and add items to cart.
          </p>
          <p className="text-[11px] font-semibold text-[#9aa2af] mt-2">{availableItemCount} items available</p>
        </div>

        <div className="px-4 mt-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-200 border ${
              selectedCategory === 'all'
                ? 'bg-[#f98e1c] text-white border-[#f98e1c]'
                : 'bg-white text-[#6b7280] border-[#e5e7eb]'
            }`}
          >
            All
          </button>
          {restaurant.menu.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`px-4 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-200 border ${
                selectedCategory === cat._id
                  ? 'bg-[#f98e1c] text-white border-[#f98e1c]'
                  : 'bg-white text-[#6b7280] border-[#e5e7eb]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        </div>

        <div className="px-4 mt-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-14 bg-white rounded-2xl border border-[#e5e7eb]">
              <UtensilsCrossed className="w-12 h-12 text-[#9ca3af] mx-auto mb-3" />
              <p className="text-[#4b5563] font-medium">No matching items found</p>
              <p className="text-[#8b95a7] text-sm mt-1">Try a different category.</p>
            </div>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[34px] font-black text-[#1f2937] leading-none">{selectedCategoryName}</h2>
                <span className="text-[11px] text-[#8b95a7] font-semibold">{filteredItems.length} items</span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {filteredItems.map((item) => (
                  <article key={item._id} className="bg-white rounded-[18px] border border-[#e5e7eb] p-2.5 shadow-sm">
                    <div className="h-[88px] rounded-xl overflow-hidden bg-[#f4f4f5]">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed className="w-6 h-6 text-[#9ca3af]" />
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5">
                      <h3 className="font-extrabold text-[13px] text-[#1f2937] leading-tight truncate">{item.name}</h3>
                      <p className="text-[10px] text-[#9ca3af] mt-0.5 truncate">{restaurant.name}</p>
                      <p className="text-[10px] text-[#b3bac6] mt-0.5 truncate">{item.description || item.category}</p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[22px] leading-none font-black text-[#1f2937]">₹{item.price}</span>
                      <button
                        onClick={() => handleAddToCart(item)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          addedItems.has(item._id)
                            ? 'bg-[#f98e1c] text-white scale-110'
                            : 'bg-[#f98e1c] text-white'
                        }`}
                      >
                        <Plus className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Sticky Cart Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full max-w-md mx-auto bg-[#13182b] hover:bg-[#0f1322] text-white
              rounded-2xl py-4 px-6 flex items-center justify-between shadow-2xl
              shadow-[#13182b]/40 transition-all duration-200 btn-press cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
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
