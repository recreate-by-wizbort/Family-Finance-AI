import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import UzsAmount from '../components/UzsAmount'
import useExchangeRates from '../hooks/useExchangeRates'
import { getSanitizedReturnPath } from '../utils/sessionLock'

const generatedNotifications = [
  {
    id: 'notif-1',
    title: 'Рост трат в категории Кафе',
    messagePrefix: 'За 7 дней расходы выросли на 38%. AI советует лимит ',
    messageAmount: '12 000',
    messageSuffix: ' в неделю.',
    time: '2 мин назад',
    icon: 'restaurant',
    tone: 'alert',
    isNew: true,
  },
  {
    id: 'notif-2',
    title: 'Семейная цель: Отпуск',
    messagePrefix: 'Вы закрыли 41% цели. Чтобы успеть к августу, откладывайте ',
    messageAmount: '22 000',
    messageSuffix: ' в месяц.',
    time: '11 мин назад',
    icon: 'beach_access',
    tone: 'info',
    isNew: true,
  },
  {
    id: 'notif-3',
    title: 'Автоплатеж настроен',
    message: 'Интернет Дом.ру будет оплачиваться автоматически 12-го числа каждого месяца.',
    time: '27 мин назад',
    icon: 'task_alt',
    tone: 'success',
    isNew: true,
  },
  {
    id: 'notif-4',
    title: 'Подписка продлена',
    messagePrefix: 'Списано ',
    messageAmount: '699',
    messageSuffix: ' за видео-сервис. Добавить в категорию Подписки?',
    time: '1 ч назад',
    icon: 'subscriptions',
    tone: 'neutral',
  },
  {
    id: 'notif-5',
    title: 'Курс USD обновился',
    message: 'USD/UZS: 92.45. Изменение за день +0.62%.',
    time: '2 ч назад',
    icon: 'currency_exchange',
    tone: 'info',
  },
  {
    id: 'notif-6',
    title: 'Новая AI-рекомендация',
    messagePrefix: 'Есть свободный остаток ',
    messageAmount: '18 500',
    messageSuffix: '. Перевести на цель Подушка безопасности?',
    time: 'Сегодня, 10:06',
    icon: 'lightbulb',
    tone: 'neutral',
  },
  {
    id: 'notif-7',
    title: 'Сюрприз-цель почти готова',
    message: 'Вы накопили 78% от запланированной суммы. Осталось 12 дней до раскрытия.',
    time: 'Сегодня, 09:18',
    icon: 'celebration',
    tone: 'success',
  },
]

function getToneClasses(tone) {
  if (tone === 'alert') {
    return 'border-[#ffb4ab]/30 bg-[#ffb4ab]/10 text-[#ffb4ab]'
  }

  if (tone === 'success') {
    return 'border-[#58d6f1]/25 bg-[#58d6f1]/10 text-[#58d6f1]'
  }

  if (tone === 'info') {
    return 'border-[#4cd6fb]/25 bg-[#4cd6fb]/10 text-[#4cd6fb]'
  }

  return 'border-[#3d494d] bg-[#112036] text-[#bcc9ce]'
}

export default function NotificationsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const rates = useExchangeRates()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])


  const returnToPath = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return getSanitizedReturnPath(params.get('returnTo'))
  }, [location.search])

  const notifications = useMemo(() => {
    return generatedNotifications.map((item) => {
      if (item.id !== 'notif-5') {
        return item
      }

      const usdRate = rates.USD.rate.toLocaleString('ru-RU')
      const diff = rates.USD.diff
      const diffLabel = `${diff >= 0 ? '+' : ''}${diff}`

      return {
        ...item,
        message: `USD/UZS: ${usdRate}. Изменение за день ${diffLabel}.`,
      }
    })
  }, [rates])

  const newCount = notifications.filter((notification) => notification.isNew).length

  return (
    <div className="min-h-screen bg-[#041329] text-[#d6e3ff]" style={{ minHeight: '100dvh' }}>
      <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-[#041329] px-6 py-4">
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight">Уведомления</h1>
          <p className="text-xs uppercase tracking-[0.18em] text-[#869398]">{newCount} новых</p>
        </div>

        <button
          aria-label="Закрыть уведомления"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3d494d]/30 bg-[#112036] text-[#d6e3ff] transition-colors duration-200 hover:bg-[#1c2a41] active:scale-95"
          onClick={() => navigate(returnToPath, { replace: true, state: { unlocked: true } })}
          type="button"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-10 pt-24">
        <section className="mb-6 rounded-2xl border border-[#3d494d]/30 bg-[#0d1c32] p-4">
          <p className="text-sm text-[#bcc9ce]">
            Здесь собраны события по расходам, целям и рекомендациям AI. Новые уведомления подсвечены сверху.
          </p>
        </section>

        <section className="space-y-4">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-2xl border p-4 ${
                notification.isNew ? 'border-[#4cd6fb]/35 bg-[#112036]' : 'border-[#3d494d]/20 bg-[#0d1c32]'
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${getToneClasses(notification.tone)}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{notification.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold">{notification.title}</h2>
                    <p className="text-xs text-[#869398]">{notification.time}</p>
                  </div>
                </div>

                {notification.isNew ? (
                  <span className="rounded-full bg-[#4cd6fb]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4cd6fb]">
                    new
                  </span>
                ) : null}
              </div>

              <p className="text-sm leading-relaxed text-[#bcc9ce]">
                {notification.messageAmount ? (
                  <>
                    {notification.messagePrefix}
                    <UzsAmount as="span" value={notification.messageAmount} />
                    {notification.messageSuffix}
                  </>
                ) : (
                  notification.message
                )}
              </p>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
