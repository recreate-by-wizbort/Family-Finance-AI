import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import UzsAmount from '../components/UzsAmount'
import { isSessionUnlocked } from '../utils/sessionLock'

const categories = [
  { title: 'ЖКХ', icon: 'home', span: 'md:col-span-2 lg:col-span-2', emphasis: true },
  { title: 'Мобильная связь', icon: 'smartphone' },
  { title: 'Топливо', icon: 'local_gas_station' },
  { title: 'Авиабилеты', icon: 'flight', highlighted: true },
  { title: 'Транспорт', icon: 'directions_bus' },
  { title: 'Интернет', icon: 'language' },
  { title: 'ТВ', icon: 'tv' },
  { title: 'Налоги', icon: 'account_balance' },
  { title: 'Образование', icon: 'school' },
  { title: 'Подписки', icon: 'subscriptions' },
  { title: 'Госуслуги', icon: 'gavel' },
]

const recentPayments = [
  {
    title: 'Дом.ру',
    subtitle: 'Интернет и ТВ • 12 Окт 2023',
    amount: '- 850,00',
    source: 'Карта •• 4402',
    icon: 'wifi',
  },
  {
    title: 'МТС',
    subtitle: 'Мобильная связь • 10 Окт 2023',
    amount: '- 450,00',
    source: 'Карта •• 4402',
    icon: 'phone_iphone',
  },
  {
    title: 'Петроэлектросбыт',
    subtitle: 'Электроэнергия • 05 Окт 2023',
    amount: '- 1 240,15',
    source: 'Счет •• 8910',
    icon: 'electric_bolt',
  },
]

export default function PayPage() {
  const isUnlocked = isSessionUnlocked()

  return (
    <div className="min-h-screen bg-[#041329] pb-32 text-[#d6e3ff]" style={{ minHeight: '100dvh' }}>
      <AppTopBar />

      <main className="mx-auto max-w-7xl px-6 pb-32 pt-24 md:pl-24">
        <section className="mb-12">
          <div className="mb-8">
            <h1 className="mb-2 font-headline text-4xl font-extrabold tracking-tight md:text-5xl">Платежи</h1>
            <p className="text-lg text-[#bcc9ce]">Быстрые оплаты и переводы в одно касание</p>
          </div>

          <div className="max-w-2xl">
            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                <span className="material-symbols-outlined text-[#869398]">search</span>
              </span>
              <input
                className="h-16 w-full rounded-t-2xl border-b-2 border-[#3d494d]/20 bg-[#0d1c32] pl-14 pr-6 text-lg font-medium text-[#d6e3ff] placeholder:text-[#869398] focus:border-[#4cd6fb] focus:outline-none"
                placeholder="Поиск услуг или организаций"
                type="text"
              />
            </label>
          </div>
        </section>

        <section className="mb-16 grid grid-cols-2 gap-6 md:grid-cols-4 lg:grid-cols-6">
          {categories.map((item) => (
            <article
              key={item.title}
              className={`group relative h-48 cursor-pointer overflow-hidden rounded-2xl p-6 transition-all ${
                item.highlighted
                  ? 'border border-[#4cd6fb]/20 bg-[#00b4d8]/10 hover:bg-[#00b4d8]/15'
                  : item.emphasis
                    ? 'bg-[#0d1c32] hover:bg-[#112036]'
                    : 'bg-[#112036] hover:bg-[#1c2a41]'
              } ${item.span ?? ''}`}
            >
              <div className="absolute right-6 top-6">
                <span className="material-symbols-outlined text-3xl text-[#4cd6fb]">{item.icon}</span>
              </div>
              <div className="absolute bottom-6 left-6">
                <h3 className={`font-bold ${item.emphasis ? 'text-xl' : ''}`}>{item.title}</h3>
                {item.emphasis ? (
                  <p className="mt-1 text-xs font-medium uppercase tracking-widest text-[#bcc9ce]">Utilities</p>
                ) : null}
              </div>
            </article>
          ))}
        </section>

        <section className="mb-16 flex flex-col gap-8 lg:flex-row">
          <article className="relative flex-1 overflow-hidden rounded-[32px] bg-gradient-to-br from-[#00b4d8]/20 to-[#0d1c32] p-10">
            <div className="relative z-10">
              <h2 className="mb-4 font-headline text-3xl font-bold">Автоплатежи</h2>
              <p className="mb-8 max-w-md text-[#bcc9ce]">
                Настройте автоматическую оплату счетов и больше не беспокойтесь о сроках. Мы напомним о каждом списании.
              </p>
              <button className="rounded-full bg-gradient-to-r from-[#4cd6fb] to-[#00b4d8] px-8 py-4 font-bold text-[#003642] transition-all hover:brightness-110 active:scale-95">
                Настроить сейчас
              </button>
            </div>
            <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#58d6f1]/15 blur-3xl" />
          </article>

          <article className="w-full rounded-[32px] border border-[#3d494d]/20 bg-[#112036] p-10 lg:w-1/3">
            <span className="material-symbols-outlined mb-4 block text-4xl text-[#58d6f1]">receipt_long</span>
            <h3 className="mb-2 text-xl font-bold">Мои квитанции</h3>
            <p className="text-[#bcc9ce]">Все счета за квартиру и налоги в одном месте.</p>
            <div className="mt-8 flex items-baseline gap-2">
              <span className="text-3xl font-bold">0</span>
              <span className="text-[#bcc9ce]">новых счетов</span>
            </div>
          </article>
        </section>

        <section className="rounded-[32px] bg-[#0d1c32] p-8 md:p-12">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="font-headline text-2xl font-bold">Недавние платежи</h2>
            <button className="font-medium text-[#4cd6fb] hover:underline">Все операции</button>
          </div>

          <div className="space-y-8">
            {recentPayments.map((payment) => (
              <div
                key={payment.title}
                className="group flex items-center justify-between rounded-2xl bg-[#010e24] p-4 transition-colors hover:bg-[#112036]"
              >
                <div className="flex items-center gap-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#27354c] text-[#4cd6fb]">
                    <span className="material-symbols-outlined text-2xl">{payment.icon}</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{payment.title}</p>
                    <p className="text-sm text-[#bcc9ce]">{payment.subtitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    <UzsAmount as="span" value={isUnlocked ? payment.amount : '- ••••'} />
                  </p>
                  <p className="text-sm text-[#bcc9ce]">{isUnlocked ? payment.source : 'Скрыто'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <AppBottomNav activeTab="pay" isUnlocked={isUnlocked} />
    </div>
  )
}
