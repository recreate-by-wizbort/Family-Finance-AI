import { ShoppingCart, Leaf } from 'lucide-react';

const transactions = [
  {
    id: 1,
    title: 'Магнит',
    category: 'Супермаркеты',
    amount: '-390,57 ₽',
    icon: ShoppingCart,
    iconBg: 'bg-[#ff3b30]',
    cardInfo: 'Дебетовая карта',
    bonus: '+3',
  },
  {
    id: 2,
    title: 'Перекрёсток',
    category: 'Супермаркеты',
    amount: '-664,05 ₽',
    icon: Leaf,
    iconBg: 'bg-[#34c759]',
    cardInfo: 'Black',
    bonus: '+6',
  },
  {
    id: 3,
    title: 'EVO_MARKET 8',
    category: 'Супермаркеты',
    amount: '-2 000 ₽',
    icon: ShoppingCart,
    iconBg: 'bg-[#ff9f0a]',
    cardInfo: '',
    bonus: '',
  }
];

export default function TransactionList() {
  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <h3 className="text-xl font-bold text-white">Февраль</h3>
        <span className="text-[#8e8e93] text-sm">-44 709 ₽</span>
      </div>

      <div className="space-y-5">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white mr-3 ${tx.iconBg}`}>
                <tx.icon size={20} />
              </div>
              <div>
                <div className="text-base font-medium text-white">{tx.title}</div>
                <div className="text-sm text-[#8e8e93]">{tx.category}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-medium text-white">{tx.amount}</div>
              <div className="text-sm text-[#8e8e93] flex items-center justify-end space-x-1 mt-0.5">
                {tx.bonus && (
                  <span className="bg-[#3a3a3c] text-[#8e8e93] text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    {tx.bonus}
                  </span>
                )}
                {tx.cardInfo && <span>{tx.cardInfo}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
