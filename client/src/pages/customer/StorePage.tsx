import { useEffect, useMemo, useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import CartDrawer from '../../components/customer/CartDrawer';
import StoreCategoryTabs from '../../components/customer/store/StoreCategoryTabs';
import StoreCheckoutForm from '../../components/customer/store/StoreCheckoutForm';
import StoreMenuSection from '../../components/customer/store/StoreMenuSection';
import StoreOverview from '../../components/customer/store/StoreOverview';
import StoreStickyCartBar from '../../components/customer/store/StoreStickyCartBar';
import StoreTopBar from '../../components/customer/store/StoreTopBar';
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
  const [portionModalItem, setPortionModalItem] = useState<MenuItem | null>(null);
  const [selectedPortionId, setSelectedPortionId] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '', phone: '', address: '', city: '', pincode: '',
  });

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

  const heroImage = useMemo(() => {
    if (!restaurant) return '';

    const withImage = restaurant.menu
      .flatMap((category) => category.items)
      .find((item) => item.isAvailable && getItemDisplayImage(item));

    return withImage ? getItemDisplayImage(withImage) : '';
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
          {heroImage ? (
            <img src={heroImage} alt={restaurant.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-[#5d7e67] to-[#385442]" />
          )}

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

        <div className="px-3 mt-2">
          <StoreMenuSection
            title={selectedCategoryName}
            items={filteredItems}
            restaurantName={restaurant.name}
            addedItems={addedItems}
            onAddToCart={(item) => handleAddToCart(item)}
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
