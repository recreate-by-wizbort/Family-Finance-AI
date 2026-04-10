import { Link } from 'react-router-dom'

const tabs = [
  { id: 'home', label: 'Главная', icon: 'home', to: '/home' },
  { id: 'transfers', label: 'Переводы', icon: 'sync_alt', to: '/transfers' },
  { id: 'pay', label: 'Платежи', icon: 'payments', to: '/pay' },
  { id: 'monitoring', label: 'Мониторинг', icon: 'analytics', to: '/monitoring' },
  { id: 'services', label: 'Все сервисы', icon: 'apps', to: '/services' },
]

export default function AppBottomNav({ activeTab, isUnlocked }) {
  return (
    <nav className="fixed bottom-0 z-50 flex w-full items-center justify-around rounded-t-[24px] bg-[#041329]/60 px-4 pb-6 pt-2 shadow-[0_-4px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab

        return (
          <Link
            key={tab.id}
            className={
              isActive
                ? 'flex scale-100 flex-col items-center justify-center rounded-2xl bg-[#112036] p-2 text-[#4cd6fb] transition-transform duration-150 active:scale-90'
                : 'flex flex-col items-center justify-center p-2 text-[#bcc9ce] transition-transform duration-150 hover:text-[#4cd6fb] active:scale-90'
            }
            state={{ unlocked: isUnlocked }}
            to={tab.to}
          >
            <span
              className="material-symbols-outlined"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {tab.icon}
            </span>
            <span className="mt-1 text-[10px] font-medium">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
