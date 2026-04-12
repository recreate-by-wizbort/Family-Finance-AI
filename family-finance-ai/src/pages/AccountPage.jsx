import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import SubpageCloseButton from '../components/SubpageCloseButton'
import { APP_USER_PROFILE } from '../data/userProfile'
import { isSessionUnlocked } from '../utils/sessionLock'

export default function AccountPage() {
  const isUnlocked = isSessionUnlocked()
  const p = APP_USER_PROFILE

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#041329] pb-32 text-[#d6e3ff]" style={{ minHeight: '100dvh' }}>
      <AppTopBar />

      <main className="mx-auto mt-20 max-w-lg px-6 pb-28">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="font-headline text-2xl font-extrabold leading-tight tracking-tight text-[#d6e3ff] sm:text-3xl">
            Мой аккаунт
          </h1>
          <SubpageCloseButton ariaLabel="Закрыть" to="/home" />
        </div>

        <section className="rounded-[32px] border border-[#2f3d52] bg-[#0d1c32] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.35)] sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div
              className="h-36 w-36 shrink-0 overflow-hidden rounded-full border-[3px] border-[#4cd6fb]/50 bg-[#112036] shadow-[0_0_0_4px_rgba(76,214,251,0.12),0_12px_40px_rgba(0,0,0,0.45)] sm:h-44 sm:w-44 sm:border-4"
            >
              <img
                alt={p.fullName}
                className="h-full w-full object-cover"
                src={p.avatarUrl}
              />
            </div>

            <h2 className="mt-8 font-headline text-2xl font-extrabold leading-tight tracking-tight text-[#d6e3ff] sm:text-[1.65rem]">
              {p.fullName}
            </h2>

            <div className="mt-8 w-full max-w-xs rounded-2xl border border-[#2f3d52] bg-[#112036]/90 px-5 py-5">
              <div className="flex flex-row items-center justify-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4cd6fb]/12 text-[#4cd6fb]">
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                    cake
                  </span>
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#869398]">Дата рождения</p>
                  <p className="mt-1 text-lg font-bold text-[#d6e3ff]">{p.birthDateDisplay}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppBottomNav activeTab="home" isUnlocked={isUnlocked} />
    </div>
  )
}
