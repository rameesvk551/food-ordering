import { UtensilsCrossed } from 'lucide-react';
import type { DisplayMenuItem } from '../types';
import StoreMenuCard from './StoreMenuCard';

interface StoreMenuSectionProps {
  title: string;
  items: DisplayMenuItem[];
  restaurantName: string;
  addedItems: Set<string>;
  onAddToCart: (item: DisplayMenuItem) => void;
}

const StoreMenuSection = ({
  title,
  items,
  restaurantName,
  addedItems,
  onAddToCart,
}: StoreMenuSectionProps) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-14 bg-white rounded-2xl border border-[#e5e7eb]">
        <UtensilsCrossed className="w-12 h-12 text-[#9ca3af] mx-auto mb-3" />
        <p className="text-[#4b5563] font-medium">No matching items found</p>
        <p className="text-[#8b95a7] text-sm mt-1">Try a different category.</p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[34px] xl:text-[46px] font-black text-[#1f2937] leading-none">{title}</h2>
        <span className="text-[11px] text-[#8b95a7] font-semibold">{items.length} items</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
        {items.map((item) => (
          <StoreMenuCard
            key={item._id}
            item={item}
            restaurantName={restaurantName}
            isAdded={addedItems.has(item._id)}
            onAdd={onAddToCart}
          />
        ))}
      </div>
    </section>
  );
};

export default StoreMenuSection;
