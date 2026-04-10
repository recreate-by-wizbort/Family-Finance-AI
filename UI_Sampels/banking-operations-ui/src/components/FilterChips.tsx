import { X, ChevronDown } from 'lucide-react';

export default function FilterChips() {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
      <button className="flex items-center bg-[#0a84ff] text-white px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap">
        Февраль <X size={16} className="ml-1" />
      </button>
      <button className="flex items-center bg-[#2c2c2e] text-white px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap">
        Счета и карты <ChevronDown size={16} className="ml-1 text-[#8e8e93]" />
      </button>
      <button className="flex items-center bg-[#2c2c2e] text-white px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap">
        Без переводов
      </button>
    </div>
  );
}
