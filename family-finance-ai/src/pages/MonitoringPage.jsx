import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import UzsAmount from '../components/UzsAmount'
import { isSessionUnlocked } from '../utils/sessionLock'

const anomalies = [
  { title: 'Кафе и рестораны', delta: '+38%', amount: '+18 400', icon: 'restaurant' },
  { title: 'Такси', delta: '+26%', amount: '+9 100', icon: 'local_taxi' },
  { title: 'Подписки', delta: '+14%', amount: '+3 200', icon: 'subscriptions' },
]

const categoryStats = [
  { name: 'Еда', value: 72, amount: '72 000', color: 'bg-[#4cd6fb]' },
  { name: 'Транспорт', value: 56, amount: '56 000', color: 'bg-[#58d6f1]' },
  { name: 'Подписки', value: 42, amount: '42 000', color: 'bg-[#7de7ff]' },
  { name: 'Развлечения', value: 34, amount: '34 000', color: 'bg-[#36c5f0]' },
]

const familyLoad = [
  { member: 'Андрей', share: 44, amount: '103 200' },
  { member: 'Мария', share: 31, amount: '72 400' },
  { member: 'Сын', share: 17, amount: '39 500' },
  { member: 'Дочь', share: 8, amount: '19 000' },
]

const goals = [
  { title: 'Подушка безопасности', progress: 63, targetPrefix: 'До цели:', targetAmount: '560 000' },
  { title: 'Отпуск в августе', progress: 41, targetPrefix: 'До цели:', targetAmount: '220 000' },
  { title: 'Сюрприз-цель', progress: 78, targetText: 'Дата раскрытия: 8 марта' },
]

export default function MonitoringPage() {
  const isUnlocked = isSessionUnlocked()

  const totalSpent = isUnlocked ? '234 100' : '••••••'
  const monthGrowth = isUnlocked ? '+12.4%' : '•••'
  const forecastAmount = isUnlocked ? '308 000' : null

  return (
    <div className="min-h-screen bg-[#041329] pb-32 text-[#d6e3ff]" style={{ minHeight: '100dvh' }}>
      <AppTopBar />

      <main className="mx-auto mt-20 max-w-5xl px-6 pb-32">
        {!isUnlocked ? (
          <div className="mb-6 rounded-2xl border border-[#4cd6fb]/20 bg-[#112036]/80 px-4 py-3 text-center text-xs uppercase tracking-[0.18em] text-[#bcc9ce]">
            Аналитика скрыта до разблокировки
          </div>
        ) : null}

        <section className="mb-8">
          <h1 className="mb-2 font-headline text-3xl font-extrabold tracking-tight">Мониторинг</h1>
          <p className="text-sm text-[#bcc9ce]">Динамика трат, семейная нагрузка и прогресс целей в реальном времени</p>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl bg-[#112036] p-5">
            <p className="mb-2 text-xs uppercase tracking-wider text-[#bcc9ce]">Расходы за 30 дней</p>
            <p className="text-2xl font-bold">
              <UzsAmount as="span" value={totalSpent} />
            </p>
          </article>

          <article className="rounded-2xl bg-[#112036] p-5">
            <p className="mb-2 text-xs uppercase tracking-wider text-[#bcc9ce]">Рост к прошлому месяцу</p>
            <p className="text-2xl font-bold text-[#ffb4ab]">{monthGrowth}</p>
          </article>

          <article className="rounded-2xl bg-[#112036] p-5">
            <p className="mb-2 text-xs uppercase tracking-wider text-[#bcc9ce]">Прогноз</p>
            {isUnlocked ? (
              <p className="text-sm font-semibold leading-relaxed text-[#d6e3ff]">
                Ожидаемо: <UzsAmount as="span" value={forecastAmount} /> к концу месяца
              </p>
            ) : (
              <p className="text-sm font-semibold leading-relaxed text-[#d6e3ff]">Прогноз скрыт до разблокировки</p>
            )}
          </article>
        </section>

        <section className="mb-8 rounded-3xl bg-[#0d1c32] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold">Аномалии</h2>
            <span className="rounded-full bg-[#ffb4ab]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#ffb4ab]">
              внимание
            </span>
          </div>

          <div className="space-y-4">
            {anomalies.map((anomaly) => (
              <div key={anomaly.title} className="flex items-center justify-between rounded-2xl bg-[#112036] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1c2a41]">
                    <span className="material-symbols-outlined text-[#4cd6fb]">{anomaly.icon}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{anomaly.title}</p>
                    <p className="text-xs text-[#bcc9ce]">
                      Дополнительный расход <UzsAmount as="span" value={isUnlocked ? anomaly.amount : '••••'} />
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold text-[#ffb4ab]">{isUnlocked ? anomaly.delta : '••%'}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl bg-[#0d1c32] p-6">
            <h2 className="mb-5 text-xl font-bold">Категории расходов</h2>
            <div className="space-y-4">
              {categoryStats.map((category) => (
                <div key={category.name}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{category.name}</span>
                    <span className="font-semibold">
                      <UzsAmount as="span" value={isUnlocked ? category.amount : '•••••'} />
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#1c2a41]">
                    <div className={`h-full rounded-full ${category.color}`} style={{ width: `${category.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-[#0d1c32] p-6">
            <h2 className="mb-5 text-xl font-bold">Семейная нагрузка</h2>
            <div className="space-y-4">
              {familyLoad.map((row) => (
                <div key={row.member} className="rounded-2xl bg-[#112036] p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold">{row.member}</span>
                    <span className="text-[#bcc9ce]">{row.share}%</span>
                  </div>
                  <div className="mb-2 h-2 rounded-full bg-[#1c2a41]">
                    <div className="h-full rounded-full bg-[#4cd6fb]" style={{ width: `${row.share}%` }} />
                  </div>
                  <p className="text-xs text-[#bcc9ce]">
                    {isUnlocked ? <UzsAmount as="span" value={row.amount} /> : 'Сумма скрыта'}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-3xl bg-[#0d1c32] p-6">
          <h2 className="mb-5 text-xl font-bold">Прогресс финансовых целей</h2>
          <div className="space-y-5">
            {goals.map((goal) => (
              <div key={goal.title}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold">{goal.title}</span>
                  <span className="text-xs text-[#bcc9ce]">{goal.progress}%</span>
                </div>
                <div className="mb-2 h-2 rounded-full bg-[#1c2a41]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#4cd6fb] to-[#00b4d8]" style={{ width: `${goal.progress}%` }} />
                </div>
                <p className="text-xs text-[#bcc9ce]">
                  {isUnlocked
                    ? goal.targetAmount
                      ? (
                        <>
                          {goal.targetPrefix} <UzsAmount as="span" value={goal.targetAmount} />
                        </>
                        )
                      : goal.targetText
                    : 'Цель скрыта до разблокировки'}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <AppBottomNav activeTab="monitoring" isUnlocked={isUnlocked} />
    </div>
  )
}
