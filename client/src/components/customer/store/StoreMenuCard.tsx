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
    <article className="bg-gradient-to-b from-[#161b22] to-[#131820] rounded-[18px] border border-[#343c48] p-2.5 shadow-[0_16px_24px_rgba(0,0,0,0.3)]">
      <div className="h-[88px] rounded-xl overflow-hidden bg-[#232a35]">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 text-[#8e8478]" />
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <h3 className="font-extrabold text-[13px] text-[#f6ede0] leading-tight truncate">{item.name}</h3>
        <p className="text-[10px] text-[#948878] mt-0.5 truncate">{restaurantName}</p>
        <p className="text-[10px] text-[#7e7569] mt-0.5 truncate">{item.description || item.category}</p>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[22px] leading-none font-black text-[#f6ede0]">Rs.{item.price}</span>
        <button
          type="button"
          onClick={() => onAdd(item)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            isAdded
              ? 'bg-gradient-to-r from-[#f2a63a] to-[#df8f22] text-[#1a1510] scale-110 shadow-[0_10px_20px_rgba(242,166,58,0.35)]'
              : 'bg-gradient-to-r from-[#f2a63a] to-[#df8f22] text-[#1a1510]'
          }`}
        >
          <Plus className="w-4.5 h-4.5" />
        </button>
      </div>
    </article>
  );
};

export default StoreMenuCard;
