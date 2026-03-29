import { Bike, Clock3, MessageCircle, Star } from 'lucide-react';
import type { DiscoverRestaurantCardData } from '../types';

interface DiscoverRestaurantCardProps {
  restaurant: DiscoverRestaurantCardData;
  onOpenStore: (restaurantSlug: string) => void;
  onOpenWhatsApp: (restaurantId: string) => void;
}

const DiscoverRestaurantCard = ({
  restaurant,
  onOpenStore,
  onOpenWhatsApp,
}: DiscoverRestaurantCardProps) => {
  return (
    <article className="h-full bg-white rounded-2xl border border-[#e5e7eb] p-2.5 shadow-sm">
      <button type="button" className="w-full" onClick={() => onOpenStore(restaurant.slug)}>
        <img
          src={restaurant.coverImage}
          alt={restaurant.name}
          className="w-full h-44 lg:h-56 rounded-2xl object-cover"
        />
      </button>

      <div className="mt-3 px-0.5">
        <h3 className="text-[31px] lg:text-[38px] font-black text-[#1f2937] leading-none">{restaurant.name}</h3>
        <p className="mt-1 text-[11px] text-[#8b95a7]">
          {restaurant.categories.join(' / ') || 'Restaurant Specials'}
        </p>
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
            onClick={() => onOpenWhatsApp(restaurant.id)}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-[#e8fff2] text-[#0f9d58] border border-[#9ee6c0]"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
        </div>
      </div>
    </article>
  );
};

export default DiscoverRestaurantCard;
