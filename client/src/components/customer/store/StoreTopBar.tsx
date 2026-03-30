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
          className="w-10 h-10 rounded-full bg-[#161b22] border border-[#383f4b] text-[#efe3d4] flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <button
          type="button"
          className="w-10 h-10 rounded-full bg-[#161b22] border border-[#383f4b] text-[#efe3d4] flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
        >
          <Ellipsis className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  );
};

export default StoreTopBar;
