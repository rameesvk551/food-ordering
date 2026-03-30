import { Search } from 'lucide-react';

interface DiscoverSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

const DiscoverSearchBar = ({ value, onChange }: DiscoverSearchBarProps) => {
  return (
    <div className="relative">
      <Search className="w-4 h-4 text-[#9a8b77] absolute left-4 top-1/2 -translate-y-1/2" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search dishes, restaurants"
        className="w-full h-11 rounded-2xl bg-[#161b22] border border-[#353d49] pl-11 pr-4 text-[13px] text-[#f6ede0] placeholder:text-[#8e8478] focus:outline-none focus:border-[#f2a63a] focus:shadow-[0_0_0_3px_rgba(242,166,58,0.15)]"
      />
    </div>
  );
};

export default DiscoverSearchBar;
