import { Link, useLocation } from 'react-router-dom'

const links = [
  { to: '/preview', label: 'Preview' },
  { to: '/home', label: 'Home' },
]

export default function PageSwitcher() {
  const location = useLocation()

  return (
    <div className="fixed left-1/2 top-4 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-[#010e24]/75 px-2 py-1 backdrop-blur">
      {links.map((link) => {
        const isActive = location.pathname === link.to

        return (
          <Link
            key={link.to}
            to={link.to}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider transition ${
              isActive
                ? 'bg-[#4cd6fb] text-[#003642]'
                : 'text-[#d6e3ff] hover:bg-white/10'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
