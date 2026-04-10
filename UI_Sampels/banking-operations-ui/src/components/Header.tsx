import { BarChart2 } from 'lucide-react';

export default function Header() {
  return (
    <div className="flex items-center justify-between px-4 py-4 pt-8 sticky top-0 bg-[#1c1c1e] z-10">
      <button className="text-[#0a84ff] text-lg font-medium">Закрыть</button>
      <h1 className="text-white text-lg font-semibold">Операции</h1>
      <button className="text-[#0a84ff]">
        <BarChart2 size={24} />
      </button>
    </div>
  );
}
