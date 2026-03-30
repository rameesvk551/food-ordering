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
    <article className="h-full rounded-2xl border border-[#343c48] p-2.5 bg-gradient-to-b from-[#171b22] to-[#12161c] shadow-[0_18px_32px_rgba(0,0,0,0.35)]">
      <button type="button" className="w-full" onClick={() => onOpenStore(restaurant.slug)}>
        <img
          src={restaurant.coverImage}
          alt={restaurant.name}
          className="w-full h-44 lg:h-56 rounded-2xl object-cover"
        />
      </button>

      <div className="mt-3 px-0.5">
        <h3 className="premium-title text-[38px] lg:text-[46px] font-semibold leading-none">{restaurant.name}</h3>
        <p className="mt-1 text-[11px] text-[#a0917e]">
          {restaurant.categories.join(' / ') || 'Restaurant Specials'}
        </p>
        <p className="mt-1 text-[10px] text-[#7e7569] line-clamp-1">{restaurant.spotlightText}</p>

        <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] text-[#b8aa95]">
          <span className="inline-flex items-center gap-1 font-semibold text-[#f2a63a]">
            <Star className="w-3.5 h-3.5 fill-[#f2a63a] text-[#f2a63a]" />
            {restaurant.rating.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Bike className="w-3.5 h-3.5 text-[#f2a63a]" />
            Free
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="w-3.5 h-3.5 text-[#f2a63a]" />
            {restaurant.deliveryMinutes} min
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-[#a0917e]">{restaurant.itemsCount} dishes available</p>
          <button
            type="button"
            onClick={() => onOpenWhatsApp(restaurant.id)}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-[#2a2419] text-[#f3c27a] border border-[#6e5933] hover:border-[#f2a63a] transition-colors"
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
