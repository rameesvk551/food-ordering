import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DiscoverCategorySection from '../../components/customer/discover/DiscoverCategorySection';
import DiscoverRestaurantFilters from '../../components/customer/discover/DiscoverRestaurantFilters';
import DiscoverRestaurantSection from '../../components/customer/discover/DiscoverRestaurantSection';
import DiscoverSearchBar from '../../components/customer/discover/DiscoverSearchBar';
import type { DiscoverItem, DiscoverRestaurant } from '../../components/customer/types';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';

const DiscoverPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
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
  }, [items, activeCategory, activeRestaurant, search]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.category).filter((category): category is string => Boolean(category)))
    ).sort((a, b) => a.localeCompare(b));
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
  }, [activeRestaurant, categories, items]);

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
  }, [activeRestaurant, filteredItems, restaurants]);

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

  const handleResetFilters = () => {
    setActiveCategory('all');
    setActiveRestaurant('all');
  };

  const handleRestaurantWhatsApp = (restaurantId: string) => {
    const item = filteredItems.find((menuItem) => menuItem.restaurant.id === restaurantId);
    if (item) handleOpenWhatsApp(item);
  };

  return (
    <div className="min-h-screen py-4 px-3 md:px-6 xl:px-8">
      <main className="max-w-md lg:max-w-7xl mx-auto min-h-[calc(100vh-2rem)] p-4 md:p-6 xl:p-8 animate-fade-in">
        <div className="max-w-2xl">
          <DiscoverSearchBar value={search} onChange={setSearch} />
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-12">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <DiscoverCategorySection
              activeCategory={activeCategory}
              categories={categoryCards}
              onSelectAll={handleResetFilters}
              onSelectCategory={setActiveCategory}
            />

            <DiscoverRestaurantFilters
              restaurants={restaurants}
              activeRestaurant={activeRestaurant}
              onSelectRestaurant={setActiveRestaurant}
            />
          </aside>

          <div className="mt-6 lg:mt-0">
            <DiscoverRestaurantSection
              loading={loading}
              restaurants={restaurantCards}
              onOpenStore={(restaurantSlug) => navigate(`/${restaurantSlug}`)}
              onOpenWhatsApp={handleRestaurantWhatsApp}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DiscoverPage;
