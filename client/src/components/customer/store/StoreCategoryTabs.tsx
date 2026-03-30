import type { MenuCategory } from '../types';

interface StoreCategoryTabsProps {
  categories: MenuCategory[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

const StoreCategoryTabs = ({
  categories,
  selectedCategory,
  onSelectCategory,
}: StoreCategoryTabsProps) => {
  return (
    <div className="px-4 mt-3">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide xl:flex-wrap xl:overflow-visible">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`px-4 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-200 border ${
            selectedCategory === 'all'
              ? 'premium-pill-active'
              : 'premium-pill hover:border-[#5b6472] hover:text-[#ded0bd]'
          }`}
        >
          All
        </button>

        {categories.map((category) => (
          <button
            key={category._id}
            type="button"
            onClick={() => onSelectCategory(category._id)}
            className={`px-4 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all duration-200 border ${
              selectedCategory === category._id
                ? 'premium-pill-active'
                : 'premium-pill hover:border-[#5b6472] hover:text-[#ded0bd]'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StoreCategoryTabs;
