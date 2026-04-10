import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import useExchangeRates from '../hooks/useExchangeRates'
import { isSessionUnlocked } from '../utils/sessionLock'

const coreServices = [
  { title: 'Карты', subtitle: 'Дебетовые и кредитные', icon: 'credit_card' },
  { title: 'Вклады', subtitle: 'До 18% годовых', icon: 'account_balance_wallet' },
  { title: 'Кредиты', subtitle: 'Ипотека и наличные', icon: 'real_estate_agent' },
  { title: 'Страхование', subtitle: 'Защита жизни и дома', icon: 'health_and_safety' },
]

const ecosystemTools = [
  { title: 'Аналитика', icon: 'analytics' },
  { title: 'Цели', icon: 'flag' },
  { title: 'QR-оплата', icon: 'qr_code_scanner' },
  { title: 'Бизнес', icon: 'business_center' },
  { title: 'Путешествия', icon: 'flight_takeoff' },
  { title: 'Поддержка', icon: 'support_agent' },
  { title: 'Безопасность', icon: 'shield' },
  { title: 'Скоро', icon: 'more_horiz', disabled: true },
]

export default function AllServicesPage() {
  const isUnlocked = isSessionUnlocked()
  const rates = useExchangeRates()

  const usdRate = rates.USD.rate.toLocaleString('ru-RU')
  const eurRate = rates.EUR.rate.toLocaleString('ru-RU')
  const usdDiff = rates.USD.diff
  const eurDiff = rates.EUR.diff

  return (
    <div className="min-h-screen bg-[#041329] pb-32 text-[#d6e3ff]" style={{ minHeight: '100dvh' }}>
      <AppTopBar />

      <main className="mx-auto max-w-5xl px-6 pb-32 pt-24">
        <section className="mb-10">
          <h1 className="mb-2 font-headline text-3xl font-extrabold tracking-tight">Все сервисы</h1>
          <p className="mb-6 text-sm font-medium text-[#bcc9ce]">Ваша цифровая финансовая экосистема</p>

          <label className="group relative block">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#bcc9ce]">
              search
            </span>
            <input
              className="w-full rounded-xl border-b border-[#3d494d]/20 bg-[#0d1c32] py-4 pl-12 pr-4 text-[#d6e3ff] placeholder:text-[#869398] focus:border-[#4cd6fb] focus:outline-none"
              placeholder="Поиск услуг и функций..."
              type="text"
            />
          </label>
        </section>

        <section className="mb-12">
          <article className="relative overflow-hidden rounded-[32px] border border-[#4cd6fb]/10 bg-gradient-to-br from-[#112036] to-[#0d1c32] p-8">
            <div className="relative z-10 grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <span className="mb-4 inline-block rounded-full bg-[#4cd6fb]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#4cd6fb]">
                  Premium AI
                </span>
                <h2 className="mb-4 font-headline text-2xl font-bold">Family Finance AI</h2>
                <p className="mb-6 leading-relaxed text-[#bcc9ce]">
                  Интеллектуальное управление семейным бюджетом. AI анализирует траты всех членов семьи и дает рекомендации по экономии.
                </p>
                <button className="rounded-full bg-gradient-to-r from-[#4cd6fb] to-[#00b4d8] px-8 py-3 font-bold text-[#003642] transition-all hover:brightness-110 active:scale-95">
                  Подключить сейчас
                </button>
              </div>

              <div className="relative hidden h-48 md:block">
                <div className="absolute inset-0 rounded-full bg-[#4cd6fb]/15 blur-[80px]" />
                <img
                  alt="AI Interface"
                  className="relative z-10 h-full w-full object-contain"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBugEpnyUcQI9LRX7kuXKI1CEbPe9QzSnTdhQxy9Ef_iOQqZ0DWrFM7mE1P69BCbZCs6vVAV04F1ixfXfgksn86RAKGbzXDdWWOMJNXhOypnc88eI6m0rfuVcYc_emCiphocfvDfCb31NCFxOQz4egUnAZgnVnph1JcP3LCu1KvMjXCipH3A4apK_UIcamTZIh8DIzTX5W2jBf2rVi7JbAia1ynEzAgI1TU-YI2Cc9SP3NydvFA5AAbo3Ni4ijLB89imA0Bvzy__-8C"
                />
              </div>
            </div>
          </article>
        </section>

        <section className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {coreServices.map((service) => (
            <article
              key={service.title}
              className="group cursor-pointer rounded-2xl border border-transparent bg-[#112036] p-6 transition-colors hover:border-[#3d494d]/20 hover:bg-[#1c2a41]"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0d1c32] transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-2xl text-[#4cd6fb]">{service.icon}</span>
              </div>
              <h3 className="mb-1 font-bold">{service.title}</h3>
              <p className="text-[10px] uppercase tracking-wider text-[#bcc9ce]">{service.subtitle}</p>
            </article>
          ))}
        </section>

        <section className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="group relative overflow-hidden rounded-2xl bg-[#0d1c32] p-8 md:col-span-2">
            <div className="relative z-10">
              <h3 className="mb-2 text-xl font-bold">Инвестиции</h3>
              <p className="mb-6 max-w-[240px] text-sm text-[#bcc9ce]">
                Откройте доступ к мировым фондовым рынкам в один клик.
              </p>
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-[#bcc9ce]">IMOEX</span>
                  <span className="text-sm font-bold text-[#58d6f1]">+1.24%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-[#bcc9ce]">Золото</span>
                  <span className="text-sm font-bold text-[#58d6f1]">+0.85%</span>
                </div>
              </div>
            </div>
            <div className="absolute right-3 top-3 opacity-20 transition-opacity group-hover:opacity-40">
              <span className="material-symbols-outlined text-[120px] text-[#4cd6fb]" style={{ fontVariationSettings: "'FILL' 1" }}>
                trending_up
              </span>
            </div>
          </article>

          <article className="rounded-2xl bg-[#27354c] p-8">
            <h3 className="mb-4 text-xl font-bold">Обмен</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#bcc9ce]">USD/UZS</span>
                <div className="text-right">
                  <span className="font-bold">{usdRate}</span>
                  <p className={`text-[10px] ${usdDiff >= 0 ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'}`}>
                    {usdDiff >= 0 ? '+' : ''}
                    {usdDiff}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#bcc9ce]">EUR/UZS</span>
                <div className="text-right">
                  <span className="font-bold">{eurRate}</span>
                  <p className={`text-[10px] ${eurDiff >= 0 ? 'text-[#58d6f1]' : 'text-[#ffb4ab]'}`}>
                    {eurDiff >= 0 ? '+' : ''}
                    {eurDiff}
                  </p>
                </div>
              </div>
            </div>
            <button className="mt-8 flex items-center gap-2 text-sm font-bold text-[#4cd6fb] transition-all hover:opacity-80">
              Перейти в обменник
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </article>
        </section>

        <section>
          <h2 className="mb-6 font-headline text-xl font-bold">Экосистема и инструменты</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {ecosystemTools.map((tool) => (
              <article
                key={tool.title}
                className={`flex flex-col items-center rounded-2xl p-6 text-center ${
                  tool.disabled ? 'bg-[#112036] opacity-50' : 'bg-[#112036]'
                }`}
              >
                <span className="material-symbols-outlined mb-3 text-3xl text-[#4cd6fb]">{tool.icon}</span>
                <span className="text-sm font-semibold">{tool.title}</span>
              </article>
            ))}
          </div>
        </section>
      </main>

      <AppBottomNav activeTab="services" isUnlocked={isUnlocked} />
    </div>
  )
}
