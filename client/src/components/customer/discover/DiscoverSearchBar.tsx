import { Search } from 'lucide-react';

interface DiscoverSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

const DiscoverSearchBar = ({ value, onChange }: DiscoverSearchBarProps) => {
  return (
    <div className="relative">
      <Search className="w-4 h-4 text-[#a4acb8] absolute left-4 top-1/2 -translate-y-1/2" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search dishes, restaurants"
        className="w-full h-11 rounded-2xl bg-[#ececef] border border-transparent pl-11 pr-4 text-[13px] text-[#1f2937] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#ff9d57]"
      />
    </div>
  );
};

export default DiscoverSearchBar;
