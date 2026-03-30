import { ChevronRight } from 'lucide-react';
import type { DiscoverCategoryCardData } from '../types';
import DiscoverCategoryCard from './DiscoverCategoryCard';

interface DiscoverCategorySectionProps {
  activeCategory: string;
  categories: DiscoverCategoryCardData[];
  onSelectAll: () => void;
  onSelectCategory: (categoryName: string) => void;
}

const DiscoverCategorySection = ({
  activeCategory,
  categories,
  onSelectAll,
  onSelectCategory,
}: DiscoverCategorySectionProps) => {
  return (
    <section className="mt-6 lg:mt-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="premium-title text-[34px] lg:text-[44px] font-semibold leading-none">All Categories</h2>
        <button type="button" className="text-sm font-semibold text-[#b8aa95] inline-flex items-center gap-1 hover:text-[#f2a63a] transition-colors">
          See All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 lg:flex-wrap lg:overflow-visible lg:pb-0">
        <DiscoverCategoryCard
          label="All"
          image=""
          startingPrice={99}
          isActive={activeCategory === 'all'}
          onClick={onSelectAll}
          showAllIcon
        />

        {categories.map((category) => (
          <DiscoverCategoryCard
            key={category.name}
            label={category.name}
            image={category.image}
            startingPrice={category.startingPrice}
            isActive={activeCategory === category.name}
            onClick={() => onSelectCategory(category.name)}
          />
        ))}
      </div>
    </section>
  );
};

export default DiscoverCategorySection;
