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
      <div className="text-center py-14 bg-[#151a21] rounded-2xl border border-[#3b4452]">
        <UtensilsCrossed className="w-12 h-12 text-[#8f8578] mx-auto mb-3" />
        <p className="text-[#f6ede0] font-medium">No matching items found</p>
        <p className="text-[#ab9f8e] text-sm mt-1">Try a different category.</p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="premium-title text-[44px] xl:text-[58px] font-semibold leading-none">{title}</h2>
        <span className="text-[11px] text-[#9f9280] font-semibold">{items.length} items</span>
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
