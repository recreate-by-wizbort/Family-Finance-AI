import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import UzsAmount from '../components/UzsAmount'
import useExchangeRates from '../hooks/useExchangeRates'
import { isSessionUnlocked } from '../utils/sessionLock'

export default function HomePage() {
  const isUnlocked = isSessionUnlocked()
  const rates = useExchangeRates()

  const balanceValue = isUnlocked ? '2 450 800.00' : '••••••'
  const spendingValue = isUnlocked ? '- 142 500' : '- ••••••'
  const usdValue = isUnlocked ? rates.USD.rate.toLocaleString('ru-RU') : '•••'
  const eurValue = isUnlocked ? rates.EUR.rate.toLocaleString('ru-RU') : '•••'
  const usdDiff = rates.USD.diff
  const eurDiff = rates.EUR.diff

  return (
    <div
      className="min-h-screen bg-[#041329] pb-32 text-[#d6e3ff]"
      style={{ minHeight: '100dvh' }}
    >
      <AppTopBar />

      <main className="mx-auto mt-20 max-w-5xl px-6">
        {!isUnlocked ? (
          <div className="mb-6 rounded-2xl border border-[#4cd6fb]/20 bg-[#112036]/80 px-4 py-3 text-center text-xs uppercase tracking-[0.18em] text-[#bcc9ce]">
            Данные скрыты до разблокировки
          </div>
        ) : null}

        <section className="mb-10">
          <div className="main-card-gradient relative overflow-hidden rounded-3xl p-8 shadow-2xl">
            <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#003642]/70">
                  Текущий баланс
                </p>
                <h2 className="text-4xl font-extrabold tracking-tight text-[#003642] md:text-5xl">
                  <UzsAmount as="span" value={balanceValue} />
                </h2>
              </div>
              <div className="mt-12 flex items-center justify-between">
                <div className="flex -space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-md">
                    <span className="material-symbols-outlined text-sm text-[#003642]">
                      credit_card
                    </span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-md">
                    <span className="material-symbols-outlined text-sm text-[#003642]">
                      account_balance_wallet
                    </span>
                  </div>
                </div>
                <button className="flex items-center gap-2 rounded-full bg-[#003642] px-5 py-2 text-sm font-bold text-[#4cd6fb] transition-all hover:opacity-90 active:scale-95">
                  Детали
                  <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="aspect-square rounded-2xl bg-[#112036] p-5 transition-colors hover:bg-[#1c2a41] md:aspect-auto">
            <div className="flex h-full flex-col justify-between">
              <span className="material-symbols-outlined text-3xl text-[#4cd6fb]">savings</span>
              <div>
                <h3 className="font-bold text-[#d6e3ff]">Вклады</h3>
                <p className="mt-1 text-xs text-[#bcc9ce]">До 15% годовых</p>
              </div>
            </div>
          </div>

          <div className="aspect-square rounded-2xl bg-[#112036] p-5 transition-colors hover:bg-[#1c2a41] md:aspect-auto">
            <div className="flex h-full flex-col justify-between">
              <span className="material-symbols-outlined text-3xl text-[#58d6f1]">campaign</span>
              <div>
                <h3 className="font-bold text-[#d6e3ff]">Акции</h3>
                <p className="mt-1 text-xs text-[#bcc9ce]">Кэшбэк до 30%</p>
              </div>
            </div>
          </div>

          <div className="aspect-square rounded-2xl bg-[#112036] p-5 transition-colors hover:bg-[#1c2a41] md:aspect-auto">
            <div className="flex h-full flex-col justify-between">
              <span className="material-symbols-outlined text-3xl text-[#4cd6fb]">
                health_and_safety
              </span>
              <div>
                <h3 className="font-bold text-[#d6e3ff]">Страхование</h3>
                <p className="mt-1 text-xs text-[#bcc9ce]">Защита активов</p>
              </div>
            </div>
          </div>

          <div className="aspect-square rounded-2xl bg-[#112036] p-5 transition-colors hover:bg-[#1c2a41] md:aspect-auto">
            <div className="flex h-full flex-col justify-between">
              <span className="material-symbols-outlined text-3xl text-[#58d6f1]">local_offer</span>
              <div>
                <h3 className="font-bold text-[#d6e3ff]">Предложения</h3>
                <p className="mt-1 text-xs text-[#bcc9ce]">Для вас</p>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-10 overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#d6e3ff]">Специальные предложения</h2>
            <button className="text-sm font-medium text-[#4cd6fb]">Все</button>
          </div>

          <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-4">
            <div className="relative flex h-40 min-w-[280px] snap-center flex-col justify-end overflow-hidden rounded-3xl bg-[#0d1c32] p-6">
              <img
                className="absolute inset-0 h-full w-full object-cover opacity-40"
                alt="modern skyscraper architecture reflecting blue sky and neon lights at dusk"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZhfBPmpUxgKQVkWHJWcu0hNyljVYXGCXOeuz_j708scbDnHq3bS2Df0tBDxBvGPkosOcz2atW9fLr8p4ms9AajhRDZdSUodt_jfSNwqgSXkHJtruQXZtgkbQPp-8U3q9EBp_Wh-SYqdlDI6xJRxtDTpbhP4Gft44XwRBYeLK5EI7OJXWZDpE13y5zwjSkqtRDd6tzatPtYPW1TH01roAPtpWgd8u83riO1mKPl6suflWl4bTKkCJ5wPmUAbKZI_3RBWkzGImjdPL9"
              />
              <div className="relative z-10">
                <span className="mb-2 inline-block rounded-full border border-[#4cd6fb]/30 bg-[#4cd6fb]/20 px-2 py-1 text-[10px] font-bold text-[#4cd6fb]">
                  VIP ПАКЕТ
                </span>
                <h4 className="text-lg font-bold leading-tight text-[#d6e3ff]">
                  Обслуживание уровня Platinum
                </h4>
              </div>
            </div>

            <div className="relative flex h-40 min-w-[280px] snap-center flex-col justify-end overflow-hidden rounded-3xl bg-[#0d1c32] p-6">
              <img
                className="absolute inset-0 h-full w-full object-cover opacity-40"
                alt="luxurious yacht interior"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjJiY09UnaDDcguY3QFXXG9NajehRFEJ5389F3255qfRouKwtzbkqk49oi2Qohq2WgDcnwLoDIXprhT6oh7Ce9Z0xguHMniqC12yZo_fkpKKpnhSOZw9wdDs2b9VpSmZqQmswbrMZLKkIeA63e9ztEClytOFcYpMBOTFduZ6LTArpRb7vAWlAjRi12WJpctlhVZIGndzNvQmFXnejcKmwNpCoblIK5o-p2BzfzQHjqsgQhs1eeHt3Dk1Yag938GJZzQrsqVEEuOrRI"
              />
              <div className="relative z-10">
                <span className="mb-2 inline-block rounded-full border border-[#58d6f1]/30 bg-[#58d6f1]/20 px-2 py-1 text-[10px] font-bold text-[#58d6f1]">
                  TRAVEL
                </span>
                <h4 className="text-lg font-bold leading-tight text-[#d6e3ff]">
                  Мильное страхование поездок
                </h4>
              </div>
            </div>

            <div className="relative flex h-40 min-w-[280px] snap-center flex-col justify-end overflow-hidden rounded-3xl bg-[#0d1c32] p-6">
              <img
                className="absolute inset-0 h-full w-full object-cover opacity-40"
                alt="abstract financial data visualization"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuChARR0sk9sTUar-F2PdDXcWZ5lRh5uX7t9P294SRWvPkn0w8bb2lqs_758XBnSzz9Pdb3zzSuFCV9g7c2soddMAMba3uEGN7KrIih6_FJAq3UN2WquBGq942s5rPU0vLkasmEQ2K1hvtbIvB3WmqIC2ET_vYZVYendrA4HrE9MNfnFBSCVxVFPZ0MLiHkgCVIgH8N_hHMGBV2Gib6Z1fTbR2EzIrcIVzRTxj4gN4L3oK4dZiAsdfGHGnWBR2BEJHd-uBx25Zgh1Hz-"
              />
              <div className="relative z-10">
                <span className="mb-2 inline-block rounded-full border border-[#4cd6fb]/30 bg-[#4cd6fb]/20 px-2 py-1 text-[10px] font-bold text-[#4cd6fb]">
                  ИНВЕСТИЦИИ
                </span>
                <h4 className="text-lg font-bold leading-tight text-[#d6e3ff]">
                  Портфельное управление Recreate
                </h4>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-[#d6e3ff]">Виджеты мониторинга</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-[#112036] p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1c2a41] text-[#4cd6fb]">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <div>
                  <h4 className="font-bold">Аналитика трат</h4>
                  <p className="text-sm text-[#bcc9ce]">За последние 30 дней</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#ffb4ab]">
                  <UzsAmount as="span" value={spendingValue} />
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#bcc9ce]">на 12% больше</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-[#112036] p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1c2a41] text-[#58d6f1]">
                  <span className="material-symbols-outlined">currency_exchange</span>
                </div>
                <div>
                  <h4 className="font-bold">Курсы валют</h4>
                  <p className="text-sm text-[#bcc9ce]">USD/UZS · EUR/UZS</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-[#bcc9ce]">USD</p>
                  <p className="font-bold">{usdValue}</p>
                  <p className={`text-[10px] ${usdDiff >= 0 ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'}`}>
                    {usdDiff >= 0 ? '+' : ''}
                    {usdDiff}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#bcc9ce]">EUR</p>
                  <p className="font-bold">{eurValue}</p>
                  <p className={`text-[10px] ${eurDiff >= 0 ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'}`}>
                    {eurDiff >= 0 ? '+' : ''}
                    {eurDiff}
                  </p>
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
