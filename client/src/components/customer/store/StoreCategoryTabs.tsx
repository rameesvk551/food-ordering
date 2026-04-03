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
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#dfe8d7]/80 font-bold">Browse by category</p>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#dfe8d7]/60">{categories.length} groups</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`shrink-0 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.24em] font-bold transition-all duration-200 ${
            selectedCategory === 'all'
              ? 'bg-[#f1f6ed] text-[#2f4638] border-[#f1f6ed] shadow-[0_8px_16px_rgba(14,20,16,0.16)]'
              : 'bg-white/10 text-[#d5dece]/90 border-white/20 hover:bg-white/16'
          }`}
        >
          Menu
        </button>

        {categories.map((category) => (
          <button
            key={category._id}
            type="button"
            onClick={() => onSelectCategory(category._id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.24em] font-bold transition-all duration-200 ${
              selectedCategory === category._id
                ? 'bg-[#f1f6ed] text-[#2f4638] border-[#f1f6ed] shadow-[0_8px_16px_rgba(14,20,16,0.16)]'
                : 'bg-white/10 text-[#d5dece]/90 border-white/20 hover:bg-white/16'
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
