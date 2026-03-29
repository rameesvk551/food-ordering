import { UtensilsCrossed } from 'lucide-react';

interface DiscoverCategoryCardProps {
  label: string;
  image: string;
  startingPrice: number;
  isActive: boolean;
  onClick: () => void;
  showAllIcon?: boolean;
}

const DiscoverCategoryCard = ({
  label,
  image,
  startingPrice,
  isActive,
  onClick,
  showAllIcon = false,
}: DiscoverCategoryCardProps) => {
  return (
    <button type="button" onClick={onClick} className="shrink-0 text-left lg:w-[140px]">
      <div
        className={`w-[94px] h-[94px] lg:w-[120px] lg:h-[120px] rounded-full border-2 p-1 bg-white transition-all ${
          isActive ? 'border-[#ff7a1a] shadow-[0_8px_18px_rgba(255,122,26,0.25)]' : 'border-[#eceff3]'
        }`}
      >
        {showAllIcon ? (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#fff4e8] to-[#ffe2c5] flex items-center justify-center">
            <UtensilsCrossed className="w-7 h-7 lg:w-8 lg:h-8 text-[#ff7a1a]" />
          </div>
        ) : image ? (
          <img src={image} alt={label} className="w-full h-full rounded-full object-cover" />
        ) : (
          <div className="w-full h-full rounded-full bg-[#f3f4f6] flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 lg:w-7 lg:h-7 text-[#9ca3af]" />
          </div>
        )}
      </div>
      <p className="mt-2 text-[17px] lg:text-[20px] font-black text-[#232b38] leading-none">{label}</p>
      <p className="mt-1 text-[11px] lg:text-[12px] text-[#8b95a7]">Starting Rs.{startingPrice || 99}</p>
    </button>
  );
};

export default DiscoverCategoryCard;
