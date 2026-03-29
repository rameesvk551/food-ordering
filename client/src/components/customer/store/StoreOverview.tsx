import { Bike, Clock3, Star } from 'lucide-react';

interface StoreOverviewProps {
  restaurantName: string;
  availableItemCount: number;
}

const StoreOverview = ({ restaurantName, availableItemCount }: StoreOverviewProps) => {
  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-4 text-[13px] text-[#4b5563]">
        <span className="inline-flex items-center gap-1 font-semibold text-[#f97316]">
          <Star className="w-3.5 h-3.5 fill-[#f97316] text-[#f97316]" />
          4.7
        </span>
        <span className="inline-flex items-center gap-1">
          <Bike className="w-3.5 h-3.5 text-[#f97316]" />
          Free
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="w-3.5 h-3.5 text-[#f97316]" />
          20 min
        </span>
      </div>

      <h1 className="text-[33px] font-black text-[#1f2937] leading-tight mt-2">{restaurantName}</h1>
      <p className="text-[12px] leading-5 text-[#8b95a7] mt-1">
        Freshly prepared favorites and chef specials. Choose your category and add items to cart.
      </p>
      <p className="text-[11px] font-semibold text-[#9aa2af] mt-2">{availableItemCount} items available</p>
    </div>
  );
};

export default StoreOverview;
