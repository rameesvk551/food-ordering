import { Bike, Clock3, Star } from 'lucide-react';

interface StoreOverviewProps {
  restaurantName: string;
  availableItemCount: number;
}

const StoreOverview = ({ restaurantName, availableItemCount }: StoreOverviewProps) => {
  return (
    <div className="px-3.5 -mt-6 relative z-20">
      <div className="rounded-[18px] bg-[#5f7f68]/95 backdrop-blur-sm px-3 py-2 border border-[#8dab92]/35 text-[#eff5e8] shadow-[0_10px_20px_rgba(40,63,50,0.24)]">
        <div className="flex items-center justify-between text-[10px]">
          <span className="inline-flex items-center gap-1 font-semibold">
            <Star className="w-3.5 h-3.5 fill-[#f3f7ef] text-[#f3f7ef]" />
            4.8
          </span>
          <span className="inline-flex items-center gap-1">
            <Bike className="w-3.5 h-3.5" />
            Free delivery
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="w-3.5 h-3.5" />
            15-20m
          </span>
        </div>
      </div>

      <div className="mt-2 rounded-[18px] bg-[#5f7f68]/95 px-3 py-2 border border-[#8dab92]/35 text-[#eaf2e3]">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold uppercase tracking-[0.12em] truncate">{restaurantName}</span>
          <span className="font-bold">{availableItemCount} dishes</span>
        </div>
      </div>
    </div>
  );
};

export default StoreOverview;
