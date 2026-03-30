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
      <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`whitespace-nowrap pb-1 text-[10px] uppercase tracking-[0.24em] transition-colors duration-200 ${
            selectedCategory === 'all'
              ? 'text-[#f1f6ed] border-b border-[#f1f6ed]'
              : 'text-[#d5dece]/80'
          }`}
        >
          Menu
        </button>

        {categories.map((category) => (
          <button
            key={category._id}
            type="button"
            onClick={() => onSelectCategory(category._id)}
            className={`whitespace-nowrap pb-1 text-[10px] uppercase tracking-[0.24em] transition-colors duration-200 ${
              selectedCategory === category._id
                ? 'text-[#f1f6ed] border-b border-[#f1f6ed]'
                : 'text-[#d5dece]/80'
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
