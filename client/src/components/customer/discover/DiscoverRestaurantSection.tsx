import { ChevronRight, UtensilsCrossed } from 'lucide-react';
import type { DiscoverRestaurantCardData } from '../types';
import DiscoverRestaurantCard from './DiscoverRestaurantCard';

interface DiscoverRestaurantSectionProps {
  loading: boolean;
  restaurants: DiscoverRestaurantCardData[];
  onOpenStore: (restaurantSlug: string) => void;
  onOpenWhatsApp: (restaurantId: string) => void;
}

const DiscoverRestaurantSection = ({
  loading,
  restaurants,
  onOpenStore,
  onOpenWhatsApp,
}: DiscoverRestaurantSectionProps) => {
  return (
    <section className="mt-5 pb-6 lg:mt-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="premium-title text-[42px] lg:text-[58px] font-semibold leading-none">Open Restaurants</h2>
        <button type="button" className="text-sm font-semibold text-[#b8aa95] inline-flex items-center gap-1 hover:text-[#f2a63a] transition-colors">
          See All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-52 rounded-2xl skeleton" />
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <section className="bg-[#151a21] rounded-2xl border border-[#3b4452] p-8 text-center">
          <UtensilsCrossed className="w-10 h-10 text-[#8e8478] mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#f6ede0]">No items found</h2>
          <p className="text-sm text-[#ab9f8e] mt-1">Try another search, restaurant, or category filter.</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {restaurants.map((restaurant) => (
            <DiscoverRestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onOpenStore={onOpenStore}
              onOpenWhatsApp={onOpenWhatsApp}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default DiscoverRestaurantSection;
