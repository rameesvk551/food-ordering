import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Clock3, MapPin, UtensilsCrossed } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import type { MenuItem, MenuPortionOption, Restaurant } from '../../components/customer/types';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';

const getItemDisplayImage = (item: Pick<MenuItem, 'image' | 'images'>) => item.image || item.images?.[0] || '';

const getPortionOptions = (item: MenuItem): MenuPortionOption[] => {
  if (Array.isArray(item.portionOptions) && item.portionOptions.length > 0) {
    return item.portionOptions;
  }

  return [{ id: 'default', name: 'Standard', price: item.price, isDefault: true }];
};

const StoreItemDetailsPage = () => {
  const { slug, itemId } = useParams<{ slug: string; itemId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPortionId, setSelectedPortionId] = useState('');
  const storeBasePath = location.pathname.startsWith('/restaurant/') ? `/restaurant/${slug}` : `/${slug}`;

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await api.get(`/public/${slug}`);
        setRestaurant(res.data.restaurant);
      } catch (error: any) {
        if (error.response?.status === 404) setNotFound(true);
        else showToast('Failed to load item details', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchStore();
  }, [showToast, slug]);

  const selectedItem = useMemo(() => {
    if (!restaurant || !itemId) return null;

    for (const category of restaurant.menu) {
      const item = category.items.find((menuItem) => menuItem._id === itemId && menuItem.isAvailable);
      if (item) {
        return {
          ...item,
          category: category.name,
        };
      }
    }

    return null;
  }, [itemId, restaurant]);

  useEffect(() => {
    if (!selectedItem) return;

    const portionOptions = getPortionOptions(selectedItem);
    const defaultOption = portionOptions.find((option) => option.isDefault) || portionOptions[0];
    setSelectedPortionId(defaultOption.id);
  }, [selectedItem]);

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const options = getPortionOptions(selectedItem);
    const selectedPortion = options.find((option) => option.id === selectedPortionId) || options[0];

    addItem({
      cartKey: `${selectedItem._id}::${selectedPortion.id}`,
      productId: selectedItem._id,
      name: selectedItem.name,
      price: selectedPortion.price,
      image: getItemDisplayImage(selectedItem),
      portionId: selectedPortion.id,
      portionName: selectedPortion.name,
    });

    showToast(`Added ${selectedItem.name} (${selectedPortion.name})`, 'success');
    navigate(storeBasePath);
  };

  if (loading) {
    return (
      <div className="olive-store-shell min-h-screen px-2 py-3 sm:px-4">
        <div className="olive-store-device mx-auto p-4">
          <div className="skeleton h-72 rounded-[28px]" />
          <div className="skeleton h-8 mt-5 w-3/5" />
          <div className="skeleton h-4 mt-3 w-full" />
          <div className="skeleton h-4 mt-2 w-4/5" />
        </div>
      </div>
    );
  }

  if (notFound || !restaurant || !selectedItem) {
    return (
      <div className="olive-store-shell min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <UtensilsCrossed className="w-16 h-16 text-[#4e6d58] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#294436] mb-2">Item Not Found</h2>
          <p className="text-[#667c6e]">This dish is not available in the restaurant menu.</p>
          <Button className="mt-5" onClick={() => navigate(storeBasePath)}>
            Back to menu
          </Button>
        </div>
      </div>
    );
  }

  const itemImage = getItemDisplayImage(selectedItem);
  const portionOptions = getPortionOptions(selectedItem);
  const selectedPortion = portionOptions.find((option) => option.id === selectedPortionId) || portionOptions[0];

  return (
    <div className="olive-store-shell min-h-screen px-2 py-3 sm:px-4">
      <div className="olive-store-device mx-auto overflow-hidden pb-8">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(storeBasePath)}
            className="w-10 h-10 rounded-full bg-[#eff4e8] border border-[#d5ddca] text-[#365142] flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] uppercase tracking-[0.28em] text-[#7b8b7a] font-bold">Item details</span>
          <button
            type="button"
            onClick={() => navigate(storeBasePath)}
            className="text-[10px] uppercase tracking-[0.22em] text-[#70826f] font-bold"
          >
            Menu
          </button>
        </div>

        <div className="px-4">
          <div className="rounded-[28px] overflow-hidden bg-[#ebf0e2] border border-[#d8e0cc] shadow-[0_14px_30px_rgba(63,84,58,0.12)]">
            {itemImage ? (
              <img src={itemImage} alt={selectedItem.name} className="h-72 w-full object-cover" />
            ) : (
              <div className="h-72 w-full flex items-center justify-center bg-gradient-to-b from-[#6b8a72] to-[#41604d]">
                <UtensilsCrossed className="w-16 h-16 text-[#e8f0dd]" />
              </div>
            )}
          </div>

          <div className="mt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-[#889786] font-bold">{restaurant.name}</p>
                <h1 className="text-[#243a2d] text-[28px] font-black leading-tight mt-1">{selectedItem.name}</h1>
              </div>
              <div className="rounded-full bg-[#f2f6ea] px-4 py-2 border border-[#dfe6d5] text-[#375043] font-black whitespace-nowrap">
                Rs.{selectedPortion.price}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.18em]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4e6] border border-[#d7e0cd] px-3 py-2 text-[#52654d]">
                <MapPin className="w-3.5 h-3.5" />
                {selectedItem.category}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4e6] border border-[#d7e0cd] px-3 py-2 text-[#52654d]">
                <Clock3 className="w-3.5 h-3.5" />
                Freshly prepared
              </span>
            </div>

            <p className="mt-5 text-[#4a5d4f] leading-7 text-[15px]">
              {selectedItem.description || 'This dish does not have a description yet.'}
            </p>

            {portionOptions.length > 1 && (
              <div className="mt-6">
                <h2 className="text-[#23382c] text-[15px] font-bold mb-3">Select portion</h2>
                <div className="grid gap-3">
                  {portionOptions.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => setSelectedPortionId(option.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                        selectedPortionId === option.id
                          ? 'bg-[#203429] border-[#5f996d] text-[#eef7eb] shadow-[0_10px_20px_rgba(55,86,63,0.18)]'
                          : 'bg-[#f8f9f2] border-[#d8e0cc] text-[#334d3e]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">{option.name}</p>
                          {option.description && <p className="text-xs mt-1 opacity-80">{option.description}</p>}
                        </div>
                        <span className="font-black">Rs.{option.price}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {portionOptions.length === 1 && (
              <div className="mt-6 rounded-2xl border border-[#d8e0cc] bg-[#f8f9f2] px-4 py-3 flex items-center gap-3 text-[#335043]">
                <Check className="w-4 h-4 text-[#5f996d]" />
                <span className="text-sm font-medium">Standard portion available</span>
              </div>
            )}

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Button onClick={handleAddToCart} className="w-full">
                Add to cart
              </Button>
              <Button variant="secondary" onClick={() => navigate(storeBasePath)} className="w-full">
                Back to menu
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreItemDetailsPage;