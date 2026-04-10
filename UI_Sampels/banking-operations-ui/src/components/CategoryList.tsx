import { ArrowRightLeft, ShoppingCart, Pizza, GraduationCap, Activity, MoreHorizontal } from 'lucide-react';

const categories = [
  { name: 'Переводы', amount: '15 879 ₽', icon: ArrowRightLeft, color: 'bg-[#32ade6]', textColor: 'text-white' },
  { name: 'Супермаркеты', amount: '12 142 ₽', icon: ShoppingCart, color: 'bg-[#ff9f0a]', textColor: 'text-white' },
  { name: 'Фастфуд', amount: '9 673 ₽', icon: Pizza, color: 'bg-[#ffd60a]', textColor: 'text-black' },
  { name: 'Образование', amount: '2 385 ₽', icon: GraduationCap, color: 'bg-[#ff375f]', textColor: 'text-white' },
  { name: 'Тренировки', amount: '1 900 ₽', icon: Activity, color: 'bg-[#0a84ff]', textColor: 'text-white' },
  { name: 'Остальное', amount: '2 728 ₽', icon: MoreHorizontal, color: 'bg-[#8e8e93]', textColor: 'text-white' },
];

export default function CategoryList() {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat, idx) => (
        <div key={idx} className="flex items-center bg-[#2c2c2e] rounded-full pl-1 pr-3 py-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${cat.color} ${cat.textColor} mr-2`}>
            <cat.icon size={14} />
          </div>
          <span className="text-sm text-white mr-2">{cat.name}</span>
          <span className="text-sm text-[#8e8e93]">{cat.amount}</span>
        </div>
      ))}
    </div>
  );
}
