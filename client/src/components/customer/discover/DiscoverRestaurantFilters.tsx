import type { DiscoverRestaurant } from '../types';

interface DiscoverRestaurantFiltersProps {
  restaurants: DiscoverRestaurant[];
  activeRestaurant: string;
  onSelectRestaurant: (restaurantSlug: string) => void;
}

const DiscoverRestaurantFilters = ({
  restaurants,
  activeRestaurant,
  onSelectRestaurant,
}: DiscoverRestaurantFiltersProps) => {
  return (
    <section className="mt-5 lg:mt-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 lg:flex-wrap lg:overflow-visible">
        <button
          type="button"
          onClick={() => onSelectRestaurant('all')}
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
            onClick={() => onSelectRestaurant(restaurant.slug)}
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
  );
};

export default DiscoverRestaurantFilters;
