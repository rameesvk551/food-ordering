import { ChevronDown, ShoppingBag } from 'lucide-react';

interface StoreStickyCartBarProps {
  totalItems: number;
  totalAmount: number;
  onOpenCart: () => void;
}

const StoreStickyCartBar = ({
  totalItems,
  totalAmount,
  onOpenCart,
}: StoreStickyCartBarProps) => {
  if (totalItems <= 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4">
      <button
        type="button"
        onClick={onOpenCart}
        className="w-full max-w-md xl:max-w-5xl mx-auto bg-[#13182b] hover:bg-[#0f1322] text-white rounded-2xl py-4 px-6 flex items-center justify-between shadow-2xl shadow-[#13182b]/40 transition-all duration-200 btn-press cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="font-bold">
            {totalItems} item{totalItems !== 1 ? 's' : ''} added
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">Rs.{totalAmount}</span>
          <ChevronDown className="w-5 h-5 rotate-180" />
        </div>
      </button>
    </div>
  );
};

export default StoreStickyCartBar;
