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
          className={`px-4 py-2 rounded-full text-[12px] font-semibold border whitespace-nowrap transition-all duration-200 ${
            activeRestaurant === 'all'
              ? 'premium-pill-active'
              : 'premium-pill hover:border-[#5b6472] hover:text-[#ded0bd]'
          }`}
        >
          All Restaurants
        </button>

        {restaurants.map((restaurant) => (
          <button
            key={restaurant.id}
            type="button"
            onClick={() => onSelectRestaurant(restaurant.slug)}
            className={`px-4 py-2 rounded-full text-[12px] font-semibold border whitespace-nowrap transition-all duration-200 ${
              activeRestaurant === restaurant.slug
                ? 'premium-pill-active'
                : 'premium-pill hover:border-[#5b6472] hover:text-[#ded0bd]'
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
