import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { X, RefreshCw, SlidersHorizontal, ArrowRightLeft, ShoppingCart, Pizza, GraduationCap, Activity, MoreHorizontal } from 'lucide-react';

const data = [
  { name: 'Переводы', value: 36, color: '#32ade6', icon: ArrowRightLeft },
  { name: 'Супермаркеты', value: 27, color: '#ff9f0a', icon: ShoppingCart },
  { name: 'Фастфуд', value: 22, color: '#ffd60a', icon: Pizza },
  { name: 'Образование', value: 5, color: '#ff375f', icon: GraduationCap },
  { name: 'Тренировки', value: 4, color: '#0a84ff', icon: Activity },
  { name: 'Остальное', value: 6, color: '#8e8e93', icon: MoreHorizontal },
];

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
  const RADIAN = Math.PI / 180;
  // Position labels slightly outside the donut
  const radius = outerRadius + 15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="#8e8e93" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function SpendingSummary() {
  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">44 709 ₽</h2>
          <p className="text-[#8e8e93] text-sm mt-1">Траты</p>
        </div>
        <button className="bg-[#2c2c2e] p-1.5 rounded-full text-[#8e8e93]">
          <X size={16} />
        </button>
      </div>

      <div className="h-64 mt-4 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center hole background to match the dark theme if needed, but Recharts handles it */}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex bg-[#2c2c2e] rounded-lg p-1 w-2/3">
          <button className="flex-1 text-center py-1.5 text-sm text-[#8e8e93] font-medium">Нед</button>
          <button className="flex-1 text-center py-1.5 text-sm bg-[#3a3a3c] rounded-md text-white font-medium shadow-sm">Мес</button>
          <button className="flex-1 text-center py-1.5 text-sm text-[#8e8e93] font-medium">Год</button>
        </div>
        <div className="flex space-x-2">
          <button className="bg-[#2c2c2e] p-2 rounded-full text-[#8e8e93]">
            <RefreshCw size={18} />
          </button>
          <button className="bg-[#2c2c2e] p-2 rounded-full text-[#8e8e93]">
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
