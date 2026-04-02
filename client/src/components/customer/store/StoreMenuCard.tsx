import { Plus, UtensilsCrossed } from 'lucide-react';
import type { DisplayMenuItem } from '../types';

interface StoreMenuCardProps {
  item: DisplayMenuItem;
  restaurantName: string;
  isAdded: boolean;
  onAdd: (item: DisplayMenuItem) => void;
}

const StoreMenuCard = ({ item, restaurantName, isAdded, onAdd }: StoreMenuCardProps) => {
  const itemImage = item.image || item.images?.[0] || '';

  return (
    <article className="bg-[#f9f4e6] rounded-[14px] border border-[#ded6bd] px-2 py-2 shadow-[0_6px_12px_rgba(88,108,84,0.10)]">
      <div className="h-[58px] w-[58px] rounded-full overflow-hidden bg-[#dce4d6] border border-[#c8d0bf] mx-auto">
        {itemImage ? (
          <img src={itemImage} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-[#7a8b76]" />
          </div>
        )}
      </div>

      <div className="mt-2 text-center">
        <h3 className="font-extrabold text-[12px] text-[#2d4c3b] leading-tight truncate uppercase tracking-[0.02em]">{item.name}</h3>
        <p className="text-[9px] text-[#6f866f] mt-0.5 truncate">{restaurantName}</p>
        <p className="text-[8px] text-[#829180] mt-0.5 truncate uppercase tracking-[0.08em]">{item.category}</p>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[16px] leading-none font-black text-[#3b5a47]">Rs.{item.price}</span>
        <button
          type="button"
          onClick={() => onAdd(item)}
          className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all duration-300 ${
            isAdded
              ? 'bg-[#4a705a] text-[#f2f6ec] scale-105 shadow-[0_8px_16px_rgba(73,111,88,0.35)]'
              : 'bg-[#5e8268] text-[#eef5e8]'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
};

export default StoreMenuCard;
