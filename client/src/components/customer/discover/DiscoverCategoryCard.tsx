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
        className={`w-[94px] h-[94px] lg:w-[120px] lg:h-[120px] rounded-full border-2 p-1 bg-[#171c24] transition-all ${
          isActive ? 'border-[#f2a63a] shadow-[0_12px_24px_rgba(242,166,58,0.28)]' : 'border-[#3a434f]'
        }`}
      >
        {showAllIcon ? (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#2c241b] to-[#1f1b17] flex items-center justify-center">
            <UtensilsCrossed className="w-7 h-7 lg:w-8 lg:h-8 text-[#f2a63a]" />
          </div>
        ) : image ? (
          <img src={image} alt={label} className="w-full h-full rounded-full object-cover" />
        ) : (
          <div className="w-full h-full rounded-full bg-[#202733] flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6 lg:w-7 lg:h-7 text-[#8e8478]" />
          </div>
        )}
      </div>
      <p className="premium-title mt-2 text-[24px] lg:text-[30px] font-semibold leading-none">{label}</p>
      <p className="mt-1 text-[11px] lg:text-[12px] text-[#9a8e80]">Starting Rs.{startingPrice || 99}</p>
    </button>
  );
};

export default DiscoverCategoryCard;
