import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Heart,
  House,
  MessageCircle,
  Plus,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DiscoverItem } from '../../components/customer/types';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';

const DiscoverPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [categoriesDrawerOpen, setCategoriesDrawerOpen] = useState(false);
  const [items, setItems] = useState<DiscoverItem[]>([]);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await api.get('/store/discover/menu-items');
        const apiItems = response.data.items || [];

        setItems(apiItems);
      } catch (error) {
        console.error('Failed to fetch menus:', error);
        showToast('Failed to load menu. Please try again later.', 'error');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, [showToast]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesQuery =
        !query
        || item.name.toLowerCase().includes(query)
        || item.description.toLowerCase().includes(query)
        || item.restaurant.name.toLowerCase().includes(query)
        || item.category.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  }, [items, activeCategory, search]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.category).filter((category): category is string => Boolean(category)))
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const handleOpenWhatsApp = (item: DiscoverItem) => {
    if (!item.restaurant.whatsappUrl) {
      showToast('WhatsApp number is not configured for this restaurant.', 'error');
      return;
    }

    const text = encodeURIComponent(
      `Hi ${item.restaurant.name}, I want to order ${item.name} (Rs.${item.price}).`
    );

    window.location.href = `${item.restaurant.whatsappUrl}?text=${text}`;
  };

  const visibleCategories = useMemo(() => ['all', ...categories].slice(0, 8), [categories]);

  const visibleItems = useMemo(() => filteredItems.slice(0, 12), [filteredItems]);

  const categoryTiles = useMemo(() => {
    return categories.map((category) => {
      const sampleItem = items.find((item) => item.category === category);
      return {
        name: category,
        image: sampleItem?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=220&q=80',
      };
    });
  }, [categories, items]);

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-md mx-auto min-h-screen px-4 pt-5 pb-24 animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-[#7ba37c] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Food"
              className="w-full h-12 rounded-xl bg-[#eef7ee] pl-12 pr-3 text-[#1f2228] placeholder:text-[#97a497] focus:outline-none border border-transparent focus:border-[#8ed290]"
            />
          </div>
          <button
            type="button"
            className="w-12 h-12 rounded-xl bg-[#44b749] text-white flex items-center justify-center"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[#1f2228] text-[20px] font-bold">All Categories</h2>
            <button
              type="button"
              onClick={() => setCategoriesDrawerOpen(true)}
              className="text-[#7c828a] font-semibold text-[16px]"
            >
              See All
            </button>
          </div>

          <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {visibleCategories.map((category) => {
              const sampleItem = items.find((item) => category === 'all' || item.category === category);
              const isActive = category === activeCategory;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    if (category === 'all') {
                      setCategoriesDrawerOpen(true);
                      return;
                    }
                    setActiveCategory(category);
                  }}
                  className="shrink-0 text-left"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl border-2 p-1 transition-all ${
                      isActive
                        ? 'border-[#f0ab2c] shadow-[0_10px_16px_rgba(240,171,44,0.28)]'
                        : 'border-[#d9e1e5]'
                    }`}
                  >
                    {category === 'all' ? (
                      <div className="w-full h-full rounded-2xl bg-[#f5fbf5] flex items-center justify-center">
                        <Search className="w-5 h-5 text-[#44b749]" />
                      </div>
                    ) : (
                      <img
                        src={sampleItem?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80'}
                        alt={category}
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    )}
                  </div>
                  <p className="mt-1.5 text-[#1f2228] text-[13px] font-bold capitalize">{category === 'all' ? 'All' : category}</p>
                  <p className="text-[#8f969d] text-[12px]">
                    Starting ${sampleItem ? sampleItem.price : 9.99}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {visibleCategories.map((category) => {
              const active = activeCategory === category;

              return (
                <button
                  key={`chip-${category}`}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-full text-[12px] font-semibold border whitespace-nowrap ${
                    active
                      ? 'bg-[#f3ae30] border-[#f3ae30] text-[#1c1b19]'
                      : 'bg-white border-[#e2e6ea] text-[#6d737c]'
                  }`}
                >
                  {category === 'all' ? 'All Restaurants' : category}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[#1f2228] text-[20px] font-bold leading-none">Open Restaurants</h2>
            <button type="button" className="text-[#7c828a] font-semibold text-[16px]">See All</button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-[#e8edf0] p-3">
                  <div className="skeleton w-24 h-24 rounded-full mx-auto" />
                  <div className="skeleton h-4 mt-3 w-3/4 mx-auto" />
                  <div className="skeleton h-3 mt-2 w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {visibleItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/${item.restaurant.slug}`)}
                  className="text-left rounded-2xl border border-[#e8edf0] bg-white p-3 relative"
                >
                  <Heart
                    className={`w-4 h-4 absolute right-3 top-3 ${
                      index % 2 === 0 ? 'text-[#b1b8be]' : 'text-[#f04444] fill-[#f04444]'
                    }`}
                  />

                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'}
                    alt={item.name}
                    className="w-24 h-24 rounded-full object-cover mx-auto"
                  />

                  <h3 className="mt-3 text-[#1f2228] text-[16px] font-bold leading-tight truncate">{item.name}</h3>

                  <div className="mt-1 flex items-center gap-3 text-[#7f8790] text-[13px]">
                    <span>20min</span>
                    <span className="inline-flex items-center gap-1 text-[#e09b23] font-semibold">
                      <Star className="w-3.5 h-3.5 fill-[#e09b23] text-[#e09b23]" />
                      4.5
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[#1f2228] text-[18px] font-extrabold">${item.price}</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenWhatsApp(item);
                      }}
                      className="w-9 h-9 rounded-xl bg-[#44b749] text-white flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#edf0f2]">
          <div className="max-w-md mx-auto px-8 h-16 flex items-center justify-between">
            <House className="w-5 h-5 text-[#44b749] fill-[#44b749]" />
            <MessageCircle className="w-5 h-5 text-[#15171c]" />
            <div className="w-8 h-8 rounded-lg bg-[#44b749] text-white flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <Bell className="w-5 h-5 text-[#15171c]" />
            <Heart className="w-5 h-5 text-[#9ca3aa]" />
          </div>
        </nav>

        {categoriesDrawerOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/45"
              onClick={() => setCategoriesDrawerOpen(false)}
            />

            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] p-4 max-h-[72vh] overflow-y-auto animate-slide-up border-t border-[#d8e8d9]">
              <div className="w-12 h-1.5 rounded-full bg-[#7bc67f] mx-auto mb-3" />

              <div className="mb-3 rounded-2xl border border-[#d7ead9] bg-[#f3faf3] p-2.5">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  {['Top Deals', 'Top Brands', 'Local Stars', 'Fastest Delivery'].map((label) => (
                    <span
                      key={label}
                      className="px-3 py-1 rounded-full bg-white border border-[#d5e7d7] text-[#2f6a33] text-[12px] font-semibold whitespace-nowrap"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#1f7a33] text-[22px] font-bold">Dishes</h3>
                <button
                  type="button"
                  onClick={() => setCategoriesDrawerOpen(false)}
                  className="w-9 h-9 rounded-full bg-[#e9f6ea] text-[#2d7b31] flex items-center justify-center border border-[#cbe3ce]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-x-3 gap-y-4 pb-3">
                {categoryTiles.map((category) => (
                  <button
                    key={`drawer-${category.name}`}
                    type="button"
                    onClick={() => {
                      setActiveCategory(category.name);
                      setCategoriesDrawerOpen(false);
                    }}
                    className="text-center"
                  >
                    <img
                      src={category.image}
                      alt={category.name}
                      className={`w-16 h-16 rounded-2xl object-cover mx-auto border-2 ${
                        activeCategory === category.name
                          ? 'border-[#48b84c] shadow-[0_6px_12px_rgba(72,184,76,0.25)]'
                          : 'border-[#e7ebef]'
                      }`}
                    />
                    <p className="mt-1.5 text-[13px] font-semibold text-[#1f2228] capitalize truncate">
                      {category.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DiscoverPage;
