import { ArrowLeft, Ellipsis } from 'lucide-react';

interface StoreTopBarProps {
  onBack: () => void;
  title?: string;
}

const StoreTopBar = ({ onBack, title }: StoreTopBarProps) => {
  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="px-2 text-[11px] font-bold uppercase tracking-[0.26em] text-[#f0f6ea] text-center truncate max-w-[55%]">
          {title || 'Restaurant'}
        </span>
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white flex items-center justify-center"
        >
          <Ellipsis className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StoreTopBar;
