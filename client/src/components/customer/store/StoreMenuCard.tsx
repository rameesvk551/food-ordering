import { Plus, UtensilsCrossed } from 'lucide-react';
import type { DisplayMenuItem } from '../types';

interface StoreMenuCardProps {
  item: DisplayMenuItem;
  restaurantName: string;
  isAdded: boolean;
  onAdd: (item: DisplayMenuItem) => void;
}

const StoreMenuCard = ({ item, restaurantName, isAdded, onAdd }: StoreMenuCardProps) => {
  return (
    <article className="bg-white rounded-[18px] border border-[#e5e7eb] p-2.5 shadow-sm">
      <div className="h-[88px] rounded-xl overflow-hidden bg-[#f4f4f5]">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-[#9ca3af]" />
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <h3 className="font-extrabold text-[13px] text-[#1f2937] leading-tight truncate">{item.name}</h3>
        <p className="text-[10px] text-[#9ca3af] mt-0.5 truncate">{restaurantName}</p>
        <p className="text-[10px] text-[#b3bac6] mt-0.5 truncate">{item.description || item.category}</p>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[22px] leading-none font-black text-[#1f2937]">Rs.{item.price}</span>
        <button
          type="button"
          onClick={() => onAdd(item)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            isAdded ? 'bg-[#f98e1c] text-white scale-110' : 'bg-[#f98e1c] text-white'
          }`}
        >
          <Plus className="w-4.5 h-4.5" />
        </button>
      </div>
    </article>
  );
};

export default StoreMenuCard;
