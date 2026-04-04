import { useEffect, useMemo, useRef, useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import CartDrawer from '../../components/customer/CartDrawer';
import StoreCategoryTabs from '../../components/customer/store/StoreCategoryTabs';
import StoreCheckoutForm from '../../components/customer/store/StoreCheckoutForm';
import StoreMenuSection from '../../components/customer/store/StoreMenuSection';
import StoreOverview from '../../components/customer/store/StoreOverview';
import StoreStickyCartBar from '../../components/customer/store/StoreStickyCartBar';
import StoreTopBar from '../../components/customer/store/StoreTopBar';
import GallerySlider from '../../components/ui/GallerySlider';
import type {
  CustomerInfo,
  DisplayMenuItem,
  MenuPortionOption,
  MenuItem,
  Restaurant,
} from '../../components/customer/types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { MenuCardSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { useCart } from '../../context/CartContext';
import api from '../../services/api';

const getItemDisplayImage = (item: Pick<MenuItem, 'image' | 'images'>) => item.image || item.images?.[0] || '';

const getPortionOptions = (item: MenuItem): MenuPortionOption[] => {
  if (Array.isArray(item.portionOptions) && item.portionOptions.length > 0) {
    return item.portionOptions;
  }

  return [{ id: 'default', name: 'Standard', price: item.price, isDefault: true }];
};

const StorePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { addItem, totalItems, totalAmount, items: cartItems, clearCart, replaceItems } = useCart();
  const { showToast } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [portionModalItem, setPortionModalItem] = useState<MenuItem | null>(null);
  const [selectedPortionId, setSelectedPortionId] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '', phone: '', address: '', city: '', pincode: '',
  });
  const [sessionPhone, setSessionPhone] = useState('');
  const [cartUpdatedAt, setCartUpdatedAt] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const suppressNextCartSyncRef = useRef(false);
  const storeBasePath = location.pathname.startsWith('/restaurant/') ? `/restaurant/${slug}` : `/${slug}`;

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await api.get(`/public/${slug}`);
        setRestaurant(res.data.restaurant);
      } catch (err: any) {
        if (err.response?.status === 404) setNotFound(true);
        else showToast('Failed to load restaurant', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchStore();
  }, [showToast, slug]);

  useEffect(() => {
    if (!slug || !restaurant) return;

    const queryPhone = searchParams.get('wa_phone') || localStorage.getItem(`customer_phone_${slug}`) || '';
    const queryName = searchParams.get('wa_name') || '';

    if (!queryPhone) {
      setSessionReady(true);
      return;
    }

    const bootstrapSession = async () => {
      try {
        const response = await api.post(`/public/${slug}/session`, {
          phone: queryPhone,
          name: queryName || undefined,
        });

        const customer = response.data?.customer;
        const serverCart = response.data?.cart || [];
        const serverCartUpdatedAt = response.data?.cartUpdatedAt || '';

        if (customer) {
          setCustomerInfo((prev) => ({
            ...prev,
            name: customer.name || prev.name,
            phone: customer.phone || prev.phone,
            address: customer.address || prev.address,
            city: customer.city || prev.city,
            pincode: customer.pincode || prev.pincode,
          }));
          setSessionPhone(customer.phone || queryPhone);
          localStorage.setItem(`customer_phone_${slug}`, customer.phone || queryPhone);
        }

        suppressNextCartSyncRef.current = true;
        replaceItems(serverCart);
        setCartUpdatedAt(serverCartUpdatedAt ? String(serverCartUpdatedAt) : '');
      } catch {
        showToast('Failed to start synced customer session', 'error');
      } finally {
        setSessionReady(true);
      }
    };

    bootstrapSession();
  }, [restaurant, replaceItems, searchParams, showToast, slug]);

  useEffect(() => {
    if (!slug || !sessionPhone || !sessionReady) return;
    if (suppressNextCartSyncRef.current) {
      suppressNextCartSyncRef.current = false;
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        const response = await api.put(`/public/${slug}/cart`, {
          phone: sessionPhone,
          customerName: customerInfo.name,
          items: cartItems,
        });
        const nextUpdatedAt = response.data?.cartUpdatedAt;
        if (nextUpdatedAt) {
          setCartUpdatedAt(String(nextUpdatedAt));
        }
      } catch {
        // Silent retry on next cart interaction
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [cartItems, customerInfo.name, sessionPhone, sessionReady, slug]);

  useEffect(() => {
    if (!slug || !sessionPhone || !sessionReady) return;

    const interval = window.setInterval(async () => {
      try {
        const response = await api.get(`/public/${slug}/cart`, {
          params: { phone: sessionPhone },
        });

        const incomingItems = response.data?.items || [];
        const incomingUpdatedAt = String(response.data?.cartUpdatedAt || '');
        if (!incomingUpdatedAt) return;

        const localTs = cartUpdatedAt ? new Date(cartUpdatedAt).getTime() : 0;
        const remoteTs = new Date(incomingUpdatedAt).getTime();

        if (remoteTs > localTs) {
          suppressNextCartSyncRef.current = true;
          replaceItems(incomingItems);
          setCartUpdatedAt(incomingUpdatedAt);
        }
      } catch {
        // Poll loop continues
      }
    }, 7000);

    return () => window.clearInterval(interval);
  }, [cartUpdatedAt, replaceItems, sessionPhone, sessionReady, slug]);

  const filteredItems = useMemo<DisplayMenuItem[]>(() => {
    if (!restaurant) return [];

    if (selectedCategory === 'all') {
      return restaurant.menu.flatMap((category) =>
        category.items
          .filter((item) => item.isAvailable)
          .map((item) => ({ ...item, category: category.name }))
      );
    }

    const category = restaurant.menu.find((item) => item._id === selectedCategory);
    return category
      ? category.items
        .filter((item) => item.isAvailable)
        .map((item) => ({ ...item, category: category.name }))
      : [];
  }, [restaurant, selectedCategory]);

  const availableItemCount = useMemo(() => {
    if (!restaurant) return 0;

    return restaurant.menu.reduce(
      (count, category) => count + category.items.filter((item) => item.isAvailable).length,
      0
    );
  }, [restaurant]);

  const selectedCategoryName = useMemo(() => {
    if (!restaurant || selectedCategory === 'all') return 'Popular Picks';
    return restaurant.menu.find((category) => category._id === selectedCategory)?.name || 'Popular Picks';
  }, [restaurant, selectedCategory]);

  const galleryImages = useMemo(() => {
    if (!restaurant) return [];

    const images: string[] = [];

    // Add gallery images first (priority 1)
    if (Array.isArray(restaurant.images) && restaurant.images.length > 0) {
      images.push(...restaurant.images);
    }

    // Add logo if gallery is empty (priority 2)
    if (images.length === 0 && restaurant.logo) {
      images.push(restaurant.logo);
    }

    // Add menu item images if still empty (priority 3)
    if (images.length === 0) {
      const menuImages = restaurant.menu
        .flatMap((category) => category.items)
        .filter((item) => item.isAvailable)
        .map((item) => getItemDisplayImage(item))
        .filter((img) => img && !images.includes(img));

      images.push(...menuImages);
    }

    return images;
  }, [restaurant]);

  const addItemWithPortion = (item: MenuItem, portion: MenuPortionOption) => {
    const cartKey = `${item._id}::${portion.id}`;
    addItem({
      cartKey,
      productId: item._id,
      name: item.name,
      price: portion.price,
      image: getItemDisplayImage(item),
      portionId: portion.id,
      portionName: portion.name,
    });

    setAddedItems((prev) => new Set(prev).add(item._id));

    setTimeout(() => {
      setAddedItems((prev) => {
        const next = new Set(prev);
        next.delete(item._id);
        return next;
      });
    }, 600);

    showToast(`Added ${item.name} (${portion.name})`, 'success');
  };

  const handleAddToCart = (item: MenuItem) => {
    const options = getPortionOptions(item);
    if (options.length <= 1) {
      addItemWithPortion(item, options[0]);
      return;
    }

    const defaultOption = options.find((option) => option.isDefault) || options[0];
    setPortionModalItem(item);
    setSelectedPortionId(defaultOption.id);
  };

  const confirmPortionSelection = () => {
    if (!portionModalItem) {
      return;
    }

    const options = getPortionOptions(portionModalItem);
    const selected = options.find((option) => option.id === selectedPortionId) || options[0];
    addItemWithPortion(portionModalItem, selected);
    setPortionModalItem(null);
    setSelectedPortionId('');
  };

  const handleCheckout = () => {
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const handleCustomerInfoChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));
    if (field === 'phone' && value.trim()) {
      setSessionPhone(value.trim());
      if (slug) {
        localStorage.setItem(`customer_phone_${slug}`, value.trim());
      }
    }
  };

  const handlePlaceOrder = async () => {
    if (!customerInfo.name || !customerInfo.phone) {
      showToast('Please enter your name and phone number', 'error');
      return;
    }

    setPlacing(true);

    try {
      await api.post(`/public/${slug}/order`, {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        address: customerInfo.address,
        city: customerInfo.city,
        pincode: customerInfo.pincode,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          portionId: item.portionId,
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
      <div className="olive-store-shell min-h-screen px-2 py-3 sm:px-4">
        <div className="olive-store-device mx-auto overflow-hidden">
          <div className="skeleton h-56 w-full rounded-[26px]" />
          <div className="p-4 space-y-4 mt-2">
            <div className="skeleton h-10 w-48" />
            <div className="grid gap-3 grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => <MenuCardSkeleton key={index} />)}
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (notFound || !restaurant) {
    return (
      <div className="olive-store-shell min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <UtensilsCrossed className="w-16 h-16 text-[#4e6d58] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#294436] mb-2">Restaurant Not Found</h2>
          <p className="text-[#667c6e]">This restaurant page doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="olive-store-shell min-h-screen px-2 py-3 sm:px-4">
      <div className="olive-store-device mx-auto pb-24">
        <div className="olive-store-hero">
          <GallerySlider 
            images={galleryImages} 
            alt={restaurant.name}
            autoPlay={true}
            autoPlayInterval={4000}
          />

          <div className="olive-store-hero-overlay" />
          <div className="relative z-10">
            <StoreTopBar onBack={() => navigate('/')} title={restaurant.name} />
            <StoreCategoryTabs
              categories={restaurant.menu}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        </div>

        <StoreOverview restaurantName={restaurant.name} availableItemCount={availableItemCount} />

        <div className="px-3 mt-3">
          <div className="rounded-2xl border border-[#d9dfce] bg-[#f6f8ef] p-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-[#466a55] border-[#466a55] text-[#f2f7ed]'
                    : 'bg-white border-[#d1d9c8] text-[#4a5f50]'
                }`}
              >
                All items
              </button>

              {restaurant.menu.map((category) => (
                <button
                  key={`menu-filter-${category._id}`}
                  type="button"
                  onClick={() => setSelectedCategory(category._id)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-all ${
                    selectedCategory === category._id
                      ? 'bg-[#466a55] border-[#466a55] text-[#f2f7ed]'
                      : 'bg-white border-[#d1d9c8] text-[#4a5f50]'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-3 mt-2">
          <StoreMenuSection
            title={selectedCategoryName}
            items={filteredItems}
            restaurantName={restaurant.name}
            addedItems={addedItems}
            onAddToCart={(item) => handleAddToCart(item)}
            onViewDetails={(item) => navigate(`${storeBasePath}/item/${item._id}`)}
          />
        </div>
      </div>

      <StoreStickyCartBar
        totalItems={totalItems}
        totalAmount={totalAmount}
        onOpenCart={() => setCartOpen(true)}
      />

      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} onCheckout={handleCheckout} />

      <Modal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Checkout" size="lg">
        <StoreCheckoutForm
          customerInfo={customerInfo}
          cartItems={cartItems}
          totalAmount={totalAmount}
          placing={placing}
          onFieldChange={handleCustomerInfoChange}
          onPlaceOrder={handlePlaceOrder}
        />
      </Modal>

      <Modal
        isOpen={Boolean(portionModalItem)}
        onClose={() => {
          setPortionModalItem(null);
          setSelectedPortionId('');
        }}
        title={portionModalItem ? `Choose Portion for ${portionModalItem.name}` : 'Choose Portion'}
      >
        {portionModalItem && (
          <div className="space-y-3">
            <p className="text-sm text-[#c8bba7]">Select your preferred size</p>
            <div className="space-y-2">
              {getPortionOptions(portionModalItem).map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => setSelectedPortionId(option.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                    selectedPortionId === option.id
                      ? 'bg-[#273228] border-[#6db27d] text-[#eef7eb]'
                      : 'bg-[#151b22] border-[#384250] text-[#d9ccb8] hover:bg-[#1a212b]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{option.name}</span>
                    <span className="font-bold">Rs.{option.price}</span>
                  </div>
                  {option.description && (
                    <p className="text-xs mt-1 text-[#a6b2a4]">{option.description}</p>
                  )}
                </button>
              ))}
            </div>
            <Button className="w-full" onClick={confirmPortionSelection}>
              Add To Cart
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StorePage;
