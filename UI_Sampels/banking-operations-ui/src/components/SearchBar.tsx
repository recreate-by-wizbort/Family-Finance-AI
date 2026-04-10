import { Search } from 'lucide-react';

export default function SearchBar() {
  return (
    <div className="bg-[#2c2c2e] rounded-xl flex items-center px-3 py-2">
      <Search size={20} className="text-[#8e8e93] mr-2" />
      <input
        type="text"
        placeholder="Поиск"
        className="bg-transparent text-white placeholder-[#8e8e93] outline-none flex-1 text-base"
      />
    </div>
  );
}
