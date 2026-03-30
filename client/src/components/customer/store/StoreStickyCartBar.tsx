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
    <div className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-16px)] max-w-[430px] -translate-x-1/2 px-2">
      <button
        type="button"
        onClick={onOpenCart}
        className="w-full bg-[#5e7f67] hover:bg-[#54735e] border border-[#3f5e49] text-[#ecf2e6] rounded-[18px] py-3.5 px-4 flex items-center justify-between shadow-[0_14px_22px_rgba(52,75,60,0.34)] transition-all duration-200 btn-press cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#486850] rounded-lg flex items-center justify-center border border-[#799b82]">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="font-bold text-[13px]">
            {totalItems} item{totalItems !== 1 ? 's' : ''} added
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#f4f7ef]">Rs.{totalAmount}</span>
          <ChevronDown className="w-5 h-5 rotate-180" />
        </div>
      </button>
    </div>
  );
};

export default StoreStickyCartBar;
