import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import SubpageCloseButton from '../components/SubpageCloseButton'
import { isSessionUnlocked } from '../utils/sessionLock'

const GOALS = [
  {
    id: 'car',
    icon: 'directions_car',
    title: 'Купить машину',
    subtitle: 'Tesla Model 3 Performance',
    progress: 45,
    saved: '2 250 000 UZS',
    monthly: '85 000 UZS',
    eta: '14 месяцев',
  },
  {
    id: 'safety',
    icon: 'shield',
    title: 'Подушка безопасности',
    subtitle: 'Запас на 6 месяцев жизни',
    progress: 82,
    saved: '1 640 000 UZS',
    monthly: '40 000 UZS',
    eta: '2 месяца',
  },
  {
    id: 'vacation',
    icon: 'beach_access',
    title: 'Отпуск на Мальдивах',
    subtitle: 'Июль 2026',
    progress: 64,
    saved: '320 000 UZS',
    monthly: '25 000 UZS',
    eta: '7 месяцев',
  },
]

function GoalCard({ goal }) {
  return (
    <section className="rounded-[28px] bg-[#0d1c32] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#112036] text-[#4cd6fb]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
              {goal.icon}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-[#d6e3ff]">{goal.title}</h2>
            <p className="truncate text-xs text-[#bcc9ce]">{goal.subtitle}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-extrabold text-[#4cd6fb]">{goal.progress}%</p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#869398]">Прогресс</p>
        </div>
      </div>

      <div className="mb-5 h-3 w-full overflow-hidden rounded-full bg-[#27354c]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#4cd6fb] to-[#58d6f1]"
          style={{ width: `${goal.progress}%` }}
        />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#112036] p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#869398]">Накоплено</p>
          <p className="mt-1 text-sm font-semibold text-[#d6e3ff]">{goal.saved}</p>
        </div>
        <div className="rounded-2xl bg-[#112036] p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#869398]">Ежемесячно</p>
          <p className="mt-1 text-sm font-semibold text-[#58d6f1]">{goal.monthly}</p>
        </div>
        <div className="rounded-2xl bg-[#112036] p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#869398]">Осталось</p>
          <p className="mt-1 text-sm font-semibold text-[#d6e3ff]">{goal.eta}</p>
        </div>
      </div>
    </section>
  )
}

export default function GoalPage() {
  const isUnlocked = isSessionUnlocked()
  const location = useLocation()
  const navigate = useNavigate()
  const cameFromFamily = location.state?.from === '/family'
  const fromScrollY = Number(location.state?.fromScrollY) || 0

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  const handleClose = () => {
    if (cameFromFamily) {
      navigate(-1)
      window.setTimeout(() => {
        window.scrollTo({ top: fromScrollY, behavior: 'auto' })
      }, 0)
      return
    }
    navigate('/monitoring')
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#041329] pb-32 text-[#d6e3ff]" style={{ minHeight: '100dvh' }}>
      <AppTopBar />

      <main className="mx-auto mt-20 max-w-5xl px-6 pb-24">
        <section className="mb-8">
          <div className="mb-2 flex items-center justify-between gap-3 font-headline text-3xl font-extrabold leading-tight tracking-tight text-[#d6e3ff]">
            <h1 className="min-w-0 flex-1">Финансовые цели</h1>
            <SubpageCloseButton
              onClose={handleClose}
              ariaLabel={cameFromFamily ? 'Вернуться к семейной группе' : 'Закрыть и вернуться к мониторингу'}
            />
          </div>
          <p className="text-sm font-normal text-[#bcc9ce]">
            Управляйте накоплениями и отслеживайте прогресс по ключевым целям.
          </p>
        </section>

        <section className="mb-5">
          <button
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] px-5 py-2.5 text-sm font-bold text-[#00414f] transition hover:brightness-110 active:scale-95"
            type="button"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Добавить цель
          </button>
        </section>

        <section className="grid grid-cols-1 gap-4">
          {GOALS.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[#58d6f1]/20 bg-[#0d1c32] px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-[#d6e3ff]">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#58d6f1] shadow-[0_0_10px_#58d6f1]" />
            Общий прогресс по целям вырос на 2.4% в этом месяце
          </div>
        </section>
      </main>

      <AppBottomNav activeTab="monitoring" isUnlocked={isUnlocked} />
    </div>
  )
}
