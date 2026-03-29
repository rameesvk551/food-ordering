import { useEffect, useMemo, useState } from 'react';
import {
  Bike,
  ChevronDown,
  ChevronRight,
  Clock3,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  Star,
  UtensilsCrossed,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useCart } from '../../context/CartContext';

interface DiscoverRestaurant {
  id: string;
  name: string;
  slug: string;
  phoneNumber: string;
  whatsappUrl: string;
}

interface DiscoverItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  restaurant: DiscoverRestaurant;
}


const DiscoverPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { totalItems } = useCart();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeRestaurant, setActiveRestaurant] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [restaurants, setRestaurants] = useState<DiscoverRestaurant[]>([]);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await api.get('/store/discover/menu-items');
        const apiItems = response.data.items || [];
        const apiRestaurants = response.data.restaurants || [];

        setItems(apiItems);
        setRestaurants(apiRestaurants);
      } catch (error) {
        console.error('Failed to fetch menus:', error);
        showToast('Failed to load menu. Please try again later.', 'error');
        setItems([]);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, [showToast]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesRestaurant = activeRestaurant === 'all' || item.restaurant.slug === activeRestaurant;
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesQuery =
        !query
        || item.name.toLowerCase().includes(query)
        || item.description.toLowerCase().includes(query)
        || item.restaurant.name.toLowerCase().includes(query)
        || item.category.toLowerCase().includes(query);

      return matchesRestaurant && matchesCategory && matchesQuery;
    });
  }, [items, activeRestaurant, activeCategory, search]);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.category).filter((category): category is string => Boolean(category)))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [items]);

  const categoryCards = useMemo(() => {
    return categories.map((category) => {
      const categoryItems = items.filter(
        (item) => item.category === category
          && (activeRestaurant === 'all' || item.restaurant.slug === activeRestaurant)
      );

      return {
        name: category,
        image: categoryItems[0]?.image || '',
        startingPrice: categoryItems.length > 0 ? Math.min(...categoryItems.map((item) => item.price)) : 0,
      };
    });
  }, [categories, items, activeRestaurant]);

  const restaurantCards = useMemo(() => {
    const lookup = new Map<string, DiscoverItem[]>();
    filteredItems.forEach((item) => {
      const group = lookup.get(item.restaurant.id) || [];
      group.push(item);
      lookup.set(item.restaurant.id, group);
    });

    return restaurants
      .filter((restaurant) => activeRestaurant === 'all' || restaurant.slug === activeRestaurant)
      .map((restaurant, index) => {
        const restaurantItems = lookup.get(restaurant.id) || [];
        const categoriesForRestaurant = Array.from(new Set(restaurantItems.map((item) => item.category))).slice(0, 3);
        const coverImage = restaurantItems[0]?.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';
        const spotlightText = restaurantItems[0]?.description || 'Chef specials and quick delivery.';
        const rating = [4.7, 4.5, 4.8, 4.6][index % 4];
        const deliveryMinutes = [20, 25, 30, 18][index % 4];

        return {
          ...restaurant,
          coverImage,
          spotlightText,
          rating,
          deliveryMinutes,
          categories: categoriesForRestaurant,
          itemsCount: restaurantItems.length,
        };
      })
      .filter((restaurant) => restaurant.itemsCount > 0);
  }, [filteredItems, restaurants, activeRestaurant]);

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

  return (
    <div className="min-h-screen py-4 px-2 md:px-4">
      <main className="max-w-md mx-auto min-h-[calc(100vh-2rem)] p-4 animate-fade-in">
        <header>
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-[#eceff3] text-[#3c4553] flex items-center justify-center"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#ff7a1a]">Deliver To</p>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4b5563]"
              >
                <MapPin className="w-3.5 h-3.5 text-[#9aa2af]" />
                Halal Lab Office
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              className="relative w-10 h-10 rounded-full bg-[#11172a] text-white flex items-center justify-center"
              onClick={() => window.scrollTo({ top: 9999, behavior: 'smooth' })}
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#ff7a1a] text-[10px] font-bold flex items-center justify-center px-1">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          <div className="mt-4">
            <h1 className="text-[16px] text-[#4b5563]">
              Hey Halal, <span className="text-[#111827] font-bold">Good Afternoon!</span>
            </h1>
          </div>

          <div className="mt-3 relative">
            <Search className="w-4 h-4 text-[#a4acb8] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes, restaurants"
              className="w-full h-11 rounded-2xl bg-[#ececef] border border-transparent pl-11 pr-4 text-[13px] text-[#1f2937] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#ff9d57]"
            />
          </div>
        </header>

        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[30px] font-black text-[#1f2937] leading-none">All Categories</h2>
            <button type="button" className="text-sm font-semibold text-[#4b5563] inline-flex items-center gap-1">
              See All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setActiveRestaurant('all');
              }}
              className="shrink-0 text-left"
            >
              <div className={`w-[94px] h-[94px] rounded-full border-2 p-1 bg-white ${activeCategory === 'all' ? 'border-[#ff7a1a]' : 'border-[#eceff3]'}`}>
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#fff4e8] to-[#ffe2c5] flex items-center justify-center">
                  <UtensilsCrossed className="w-7 h-7 text-[#ff7a1a]" />
                </div>
              </div>
              <p className="mt-2 text-[17px] font-black text-[#232b38] leading-none">All</p>
              <p className="mt-1 text-[11px] text-[#8b95a7]">Starting Rs.99</p>
            </button>

            {categoryCards.map((category) => (
              <button
                key={category.name}
                type="button"
                onClick={() => setActiveCategory(category.name)}
                className="shrink-0 text-left"
              >
                <div className={`w-[94px] h-[94px] rounded-full border-2 p-1 bg-white transition-all ${activeCategory === category.name ? 'border-[#ff7a1a] shadow-[0_8px_18px_rgba(255,122,26,0.25)]' : 'border-[#eceff3]'}`}>
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#f3f4f6] flex items-center justify-center">
                      <UtensilsCrossed className="w-6 h-6 text-[#9ca3af]" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-[17px] font-black text-[#232b38] leading-none">{category.name}</p>
                <p className="mt-1 text-[11px] text-[#8b95a7]">Starting Rs.{category.startingPrice || 99}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            <button
              type="button"
              onClick={() => setActiveRestaurant('all')}
              className={`px-4 py-2 rounded-full text-[12px] font-semibold border whitespace-nowrap ${
                activeRestaurant === 'all'
                  ? 'bg-[#ff7a1a] text-white border-[#ff7a1a]'
                  : 'bg-white text-[#6b7280] border-[#e5e7eb]'
              }`}
            >
              All Restaurants
            </button>
            {restaurants.map((restaurant) => (
              <button
                key={restaurant.id}
                type="button"
                onClick={() => setActiveRestaurant(restaurant.slug)}
                className={`px-4 py-2 rounded-full text-[12px] font-semibold border whitespace-nowrap ${
                  activeRestaurant === restaurant.slug
                    ? 'bg-[#ff7a1a] text-white border-[#ff7a1a]'
                    : 'bg-white text-[#6b7280] border-[#e5e7eb]'
                }`}
              >
                {restaurant.name}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[34px] font-black text-[#1f2937] leading-none">Open Restaurants</h2>
            <button type="button" className="text-sm font-semibold text-[#4b5563] inline-flex items-center gap-1">
              See All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-52 rounded-2xl skeleton" />
              ))}
            </div>
          ) : restaurantCards.length === 0 ? (
            <section className="bg-white rounded-2xl border border-[#e5e7eb] p-8 text-center">
              <UtensilsCrossed className="w-10 h-10 text-[#9ca3af] mx-auto mb-3" />
              <h2 className="text-base font-bold text-[#1f2937]">No items found</h2>
              <p className="text-sm text-[#6b7280] mt-1">Try another search, restaurant, or category filter.</p>
            </section>
          ) : (
            <div className="space-y-4">
              {restaurantCards.map((restaurant) => (
                <article
                  key={restaurant.id}
                  className="bg-white rounded-2xl border border-[#e5e7eb] p-2.5 shadow-sm"
                >
                  <button
                    type="button"
                    className="w-full"
                    onClick={() => navigate(`/${restaurant.slug}`)}
                  >
                    <img
                      src={restaurant.coverImage}
                      alt={restaurant.name}
                      className="w-full h-44 rounded-2xl object-cover"
                    />
                  </button>

                  <div className="mt-3 px-0.5">
                    <h3 className="text-[31px] font-black text-[#1f2937] leading-none">{restaurant.name}</h3>
                    <p className="mt-1 text-[11px] text-[#8b95a7]">{restaurant.categories.join(' · ') || 'Restaurant Specials'}</p>
                    <p className="mt-1 text-[10px] text-[#b3bac6] line-clamp-1">{restaurant.spotlightText}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] text-[#4b5563]">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#f97316]">
                        <Star className="w-3.5 h-3.5 fill-[#f97316] text-[#f97316]" />
                        {restaurant.rating.toFixed(1)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Bike className="w-3.5 h-3.5 text-[#f97316]" />
                        Free
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="w-3.5 h-3.5 text-[#f97316]" />
                        {restaurant.deliveryMinutes} min
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] text-[#8b95a7]">{restaurant.itemsCount} dishes available</p>
                      <button
                        type="button"
                        onClick={() => {
                          const item = filteredItems.find((menuItem) => menuItem.restaurant.id === restaurant.id);
                          if (item) handleOpenWhatsApp(item);
                        }}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-[#e8fff2] text-[#0f9d58] border border-[#9ee6c0]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default DiscoverPage;
