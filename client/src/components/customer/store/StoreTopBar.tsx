import { ArrowLeft, Ellipsis } from 'lucide-react';

interface StoreTopBarProps {
  onBack: () => void;
}

const StoreTopBar = ({ onBack }: StoreTopBarProps) => {
  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/95 text-[#1f2937] flex items-center justify-center shadow"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-white/95 text-[#1f2937] flex items-center justify-center shadow"
        >
          <Ellipsis className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
};

export default StoreTopBar;
