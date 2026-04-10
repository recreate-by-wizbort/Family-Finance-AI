import { useLocation, useNavigate } from 'react-router-dom'
import andreyAvatarDataUri from '../constants/andreyAvatarDataUri'

export default function AppTopBar() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleOpenNotifications = () => {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    const search = new URLSearchParams({ returnTo }).toString()

    navigate(`/notifications?${search}`)
  }

  return (
    <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-[#041329] px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-full border border-[#3d494d]/20 bg-[#27354c]">
          <img alt="Андрей" className="h-full w-full object-cover" src={andreyAvatarDataUri} />
        </div>
        <span className="font-headline text-lg font-bold tracking-tighter text-[#d6e3ff]">Андрей</span>
      </div>

      <button
        aria-label="Открыть уведомления"
        className="flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#112036] active:scale-95"
        onClick={handleOpenNotifications}
        type="button"
      >
        <span className="material-symbols-outlined text-[#4cd6fb]">notifications</span>
      </button>
    </header>
  )
}
