import { UtensilsCrossed } from 'lucide-react';
import type { DisplayMenuItem } from '../types';
import StoreMenuCard from './StoreMenuCard';

interface StoreMenuSectionProps {
  title: string;
  items: DisplayMenuItem[];
  restaurantName: string;
  addedItems: Set<string>;
  onAddToCart: (item: DisplayMenuItem) => void;
  onViewDetails: (item: DisplayMenuItem) => void;
}

const StoreMenuSection = ({
  title,
  items,
  restaurantName,
  addedItems,
  onAddToCart,
  onViewDetails,
}: StoreMenuSectionProps) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-14 bg-[#eef0df] rounded-3xl border border-[#d7d9c7]">
        <UtensilsCrossed className="w-12 h-12 text-[#6e806f] mx-auto mb-3" />
        <p className="text-[#3e5648] font-semibold">No matching dishes found</p>
        <p className="text-[#748676] text-sm mt-1">Try another category tab.</p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-end justify-between mb-2.5 px-1">
        <h2 className="olive-store-section-title">{title}</h2>
        <span className="text-[10px] text-[#7d8f7e] font-semibold uppercase tracking-[0.18em]">{items.length} items</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <StoreMenuCard
            key={item._id}
            item={item}
            restaurantName={restaurantName}
            isAdded={addedItems.has(item._id)}
            onAdd={onAddToCart}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </section>
  );
};

export default StoreMenuSection;
