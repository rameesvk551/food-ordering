import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Search, Store, UtensilsCrossed } from 'lucide-react';
import api from '../../services/api';
import Input from '../../components/ui/Input';
import { MenuCardSkeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

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
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeRestaurant, setActiveRestaurant] = useState('all');
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [restaurants, setRestaurants] = useState<DiscoverRestaurant[]>([]);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const response = await api.get('/store/discover/menu-items');
        setItems(response.data.items || []);
        setRestaurants(response.data.restaurants || []);
      } catch {
        showToast('Unable to load menu items right now.', 'error');
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
      const matchesQuery =
        !query
        || item.name.toLowerCase().includes(query)
        || item.description.toLowerCase().includes(query)
        || item.restaurant.name.toLowerCase().includes(query)
        || item.category.toLowerCase().includes(query);

      return matchesRestaurant && matchesQuery;
    });
  }, [items, activeRestaurant, search]);

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
    <div className="min-h-screen bg-primary-50 pb-8">
      <header className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 text-white px-4 pt-8 pb-6 rounded-b-[2rem] shadow-lg">
        <div className="max-w-md mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide bg-white/15 px-3 py-1 rounded-full mb-3">
            <Store className="w-3.5 h-3.5" />
            Discover Food
          </div>
          <h1 className="text-3xl font-black leading-tight">Order From Nearby Restaurants</h1>
          <p className="text-primary-100 text-sm mt-2">
            Browse all menus in one place. Tap any item to chat and order on WhatsApp.
          </p>

          <div className="mt-5 bg-white rounded-2xl p-2 shadow-xl">
            <Input
              placeholder="Search food, category, or restaurant"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-3">
        <section className="py-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            <button
              type="button"
              onClick={() => setActiveRestaurant('all')}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                activeRestaurant === 'all'
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-text-secondary border-border'
              }`}
            >
              All Restaurants
            </button>

            {restaurants.map((restaurant) => (
              <button
                key={restaurant.id}
                type="button"
                onClick={() => setActiveRestaurant(restaurant.slug)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                  activeRestaurant === restaurant.slug
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-white text-text-secondary border-border'
                }`}
              >
                {restaurant.name}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <MenuCardSkeleton key={index} />
            ))}
          </section>
        ) : filteredItems.length === 0 ? (
          <section className="bg-white rounded-2xl border border-border p-8 text-center">
            <UtensilsCrossed className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h2 className="text-base font-bold text-text-primary">No items found</h2>
            <p className="text-sm text-text-secondary mt-1">Try another search or restaurant filter.</p>
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-3 animate-fade-in">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenWhatsApp(item)}
                className="bg-white rounded-2xl border border-border overflow-hidden text-left shadow-sm active:scale-[0.98] transition-transform"
              >
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                    <UtensilsCrossed className="w-7 h-7 text-primary-500" />
                  </div>
                )}

                <div className="p-3">
                  <p className="text-xs font-semibold text-primary-600 truncate">{item.restaurant.name}</p>
                  <h3 className="text-sm font-bold text-text-primary mt-1 line-clamp-1">{item.name}</h3>
                  <p className="text-[11px] text-text-muted mt-1 line-clamp-1">{item.category}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-text-primary">Rs.{item.price}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-1">
                      <MessageCircle className="w-3 h-3" />
                      WhatsApp
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}
      </main>

      <button
        type="button"
        className="fixed bottom-5 right-5 w-12 h-12 rounded-full bg-green-600 text-white shadow-xl flex items-center justify-center"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <Search className="w-5 h-5" />
      </button>
    </div>
  );
};

export default DiscoverPage;
