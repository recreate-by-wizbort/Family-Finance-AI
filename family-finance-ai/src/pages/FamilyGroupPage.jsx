import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppBottomNav from '../components/AppBottomNav'
import SubpageCloseButton, { SUBPAGE_CLOSE_BUTTON_CLASS } from '../components/SubpageCloseButton'
import AppTopBar from '../components/AppTopBar'
import CostPage from './CostPage'
import UzsAmount, { UZS_AMOUNT_SUFFIX_CLASS } from '../components/UzsAmount.jsx'
import { isSessionUnlocked } from '../utils/sessionLock'
import { ACCOUNTS, LINKED_EXTERNAL_CARDS, PRIMARY_BANK_RECREATE } from '../mockData'

const INVITE_LINK = 'https://vault.family/join/xK92Lp'
const PANEL_ANIM_MS = 320

/** Единая оболочка карточек на странице семьи (как блок «Аналитика»). */
const FAMILY_CARD_SHELL = 'relative overflow-hidden rounded-[32px] bg-[#0d1c32] p-6 md:p-8'

const INITIAL_RESERVE_AMOUNT = 9_900_000
const LAST_MONTH_RESERVE = 1_600_000

function parseAmount(rawValue) {
  const digits = String(rawValue ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

const MEMBER_CONTRIBUTIONS = [
  { id: 'user_1', name: 'Alisher', avatar: 'A', color: '#4cd6fb', amount: 5_200_000, pct: 52.5, topups: 12, withdrawals: 3 },
  { id: 'user_2', name: 'Malika', avatar: 'M', color: '#58d6f1', amount: 3_500_000, pct: 35.4, topups: 8, withdrawals: 2 },
  { id: 'user_3', name: 'Timur', avatar: 'T', color: '#22c55e', amount: 1_200_000, pct: 12.1, topups: 4, withdrawals: 1 },
]

/** Как на /home: только платёжные карты владельца (user_1), без вкладов. */
const HOME_OWNER_ID = 'user_1'
const PRIMARY_ACCOUNT_ID = 'acc_tbc_main'
const TRAILING_LIST_ACCOUNT_ID = 'acc_hamkor_current'

function last4FromPan(pan) {
  const d = String(pan).replace(/\D/g, '')
  return d.slice(-4)
}

function getOwnPaymentCardsForTopup() {
  const primary = ACCOUNTS.find((a) => a.id === PRIMARY_ACCOUNT_ID)
  const bank = primary?.bank ?? PRIMARY_BANK_RECREATE
  const myAccounts = ACCOUNTS.filter((a) => a.userId === HOME_OWNER_ID)
  const myLinked = LINKED_EXTERNAL_CARDS.filter((c) => c.ownerUserId === HOME_OWNER_ID)
  const rows = []

  const pushAccount = (acc) => {
    if (!acc.card || acc.type === 'deposit' || acc.bank !== bank) return
    const last4 = last4FromPan(acc.card.pan)
    rows.push({
      id: acc.id,
      kind: 'account',
      label: acc.label,
      subtitle: `${acc.card.processingSystem} *${last4}`,
      balanceUzs: acc.balanceUzs ?? 0,
      accentColor: acc.card.accentColor ?? '#4cd6fb',
    })
  }

  myAccounts.forEach((acc) => {
    if (acc.id === TRAILING_LIST_ACCOUNT_ID) return
    pushAccount(acc)
  })
  const trailing = myAccounts.find((a) => a.id === TRAILING_LIST_ACCOUNT_ID)
  if (trailing) pushAccount(trailing)

  myLinked.forEach((card) => {
    const last4 = last4FromPan(card.pan)
    const label = card.userLabel?.trim() || 'Карта'
    rows.push({
      id: card.id,
      kind: 'linked',
      label,
      subtitle: `${card.processingSystem} *${last4}`,
      balanceUzs: typeof card.balanceUzs === 'number' ? card.balanceUzs : 0,
      accentColor: card.accentColor ?? '#4cd6fb',
    })
  })

  return rows
}

/** Круг и стрелка — те же размеры, что у `SubpageCloseButton` (крестик). */
function CircleArrowButton({ onClick, ariaLabel }) {
  return (
    <button
      aria-label={ariaLabel}
      className={SUBPAGE_CLOSE_BUTTON_CLASS}
      type="button"
      onClick={onClick}
    >
      <span
        className="material-symbols-outlined leading-none text-[#4cd6fb]"
        style={{
          fontSize: 'clamp(1.625rem, 4.2vw, 1.875rem)',
          fontVariationSettings: '"FILL" 0, "wght" 600',
        }}
      >
        arrow_forward
      </span>
    </button>
  )
}

const FAMILY_GOALS_DATA = [
  { id: 'goal_1', title: 'Купить машину', icon: 'directions_car', progress: 45, saved: 2_250_000, target: 5_000_000 },
  { id: 'goal_2', title: 'Семейный отпуск', icon: 'beach_access', progress: 64, saved: 320_000, target: 500_000 },
  { id: 'goal_3', title: 'Подушка безопасности', icon: 'shield', progress: 82, saved: 1_640_000, target: 2_000_000 },
]

const ALL_TRANSFERS = [
  {
    id: 'tr_1',
    from: { name: 'Alisher', cardLast4: '1234', bank: 'HUMO' },
    to: { name: 'Malika', cardLast4: '7890', bank: 'Kapital Bank' },
    amount: 1_500_000,
    category: 'Продукты и быт',
    timestamp: '2026-04-10T14:20:00+05:00',
    description: 'Ежемесячный перевод на хозяйственные расходы',
  },
  {
    id: 'tr_2',
    from: { name: 'Malika', cardLast4: '7890', bank: 'Kapital Bank' },
    to: { name: 'Timur', cardLast4: '4521', bank: 'Uzum Bank' },
    amount: 250_000,
    category: 'Карманные расходы',
    timestamp: '2026-04-09T18:45:00+05:00',
    description: 'Карманные деньги на неделю',
  },
  {
    id: 'tr_3',
    from: { name: 'Alisher', cardLast4: '1234', bank: 'HUMO' },
    to: { name: 'Timur', cardLast4: '4521', bank: 'Uzum Bank' },
    amount: 400_000,
    category: 'Обучение',
    timestamp: '2026-04-08T10:15:00+05:00',
    description: 'Оплата репетиторов и курсов',
  },
  {
    id: 'tr_4',
    from: { name: 'Malika', cardLast4: '7890', bank: 'Kapital Bank' },
    to: { name: 'Alisher', cardLast4: '1234', bank: 'HUMO' },
    amount: 800_000,
    category: 'Возврат средств',
    timestamp: '2026-04-07T12:30:00+05:00',
    description: 'Частичный возврат за совместную покупку',
  },
  {
    id: 'tr_5',
    from: { name: 'Alisher', cardLast4: '1234', bank: 'HUMO' },
    to: { name: 'Malika', cardLast4: '7890', bank: 'Kapital Bank' },
    amount: 2_000_000,
    category: 'Аренда',
    timestamp: '2026-04-05T09:00:00+05:00',
    description: 'Доля оплаты за квартиру',
  },
  {
    id: 'tr_6',
    from: { name: 'Timur', cardLast4: '4521', bank: 'Uzum Bank' },
    to: { name: 'Malika', cardLast4: '7890', bank: 'Kapital Bank' },
    amount: 50_000,
    category: 'Личные',
    timestamp: '2026-04-03T16:40:00+05:00',
    description: 'Возврат за продукты',
  },
]

function formatDate(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 86_400_000) return `Сегодня, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  if (diff < 172_800_000) return `Вчера, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function getTransferFrequency(transfer) {
  const pair = `${transfer.from.name}-${transfer.to.name}`
  const counts = { 'Alisher-Malika': 18, 'Malika-Timur': 12, 'Alisher-Timur': 6, 'Malika-Alisher': 4, 'Timur-Malika': 2 }
  return counts[pair] || 1
}

function MemberAvatar({ name, color, size = 'md', initial }) {
  const letter = (initial ?? name?.[0] ?? '?').toString().slice(0, 1).toUpperCase()
  const sizeClasses = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-14 w-14 text-xl' : 'h-10 w-10 text-sm'
  return (
    <div
      className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ backgroundColor: color + '33', color }}
    >
      {letter}
    </div>
  )
}

function BottomPanel({ open, onClose, title, children, sheetMaxClass = 'max-h-[85dvh]' }) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (open) {
      setVisible(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)))
    } else {
      setAnimating(false)
      const t = setTimeout(() => setVisible(false), PANEL_ANIM_MS)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end overscroll-none">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${animating ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: `${PANEL_ANIM_MS}ms` }}
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex ${sheetMaxClass} min-h-0 w-full flex-col rounded-t-[28px] border-t border-[#3d494d] bg-[#010e24]/98 shadow-[0_-12px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-transform ${
          animating ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ transitionDuration: `${PANEL_ANIM_MS}ms`, transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        <div className="shrink-0 px-5 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#4cd6fb]/30" />
          {title && (
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-headline text-xl font-bold text-[#d6e3ff]">{title}</h3>
              <button
                aria-label="Закрыть"
                className={SUBPAGE_CLOSE_BUTTON_CLASS}
                onClick={onClose}
                type="button"
              >
                <span
                  className="material-symbols-outlined leading-none text-[#4cd6fb]"
                  style={{
                    fontSize: 'clamp(1.625rem, 4.2vw, 1.875rem)',
                    fontVariationSettings: '"FILL" 0, "wght" 600',
                  }}
                >
                  close
                </span>
              </button>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </div>
    </div>
  )
}

function CardSelectPanel({ open, onClose, onCardPick }) {
  const ownCards = useMemo(() => getOwnPaymentCardsForTopup(), [])

  return (
    <BottomPanel open={open} onClose={onClose} title="Пополнить резерв">
      <p className="mb-4 text-sm text-[#bcc9ce]">Выберите карту для пополнения</p>
      <div className="mb-2 space-y-3">
        {ownCards.map((card) => (
          <button
            key={card.id}
            className="flex w-full items-center gap-4 rounded-xl border-2 border-transparent bg-[#0d1c32] p-4 text-left transition hover:bg-[#112036]"
            onClick={() => onCardPick(card)}
            type="button"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${card.accentColor}22` }}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ color: card.accentColor, fontVariationSettings: '"FILL" 1' }}
              >
                credit_card
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#d6e3ff]">{card.label}</p>
              <p className="text-xs text-[#bcc9ce]">{card.subtitle}</p>
            </div>
            <div className="text-right">
              <UzsAmount
                as="span"
                className="inline-flex justify-end text-sm font-bold text-[#d6e3ff]"
                compact
                compactFrom={1_000_000}
                value={String(card.balanceUzs)}
              />
            </div>
          </button>
        ))}
      </div>
    </BottomPanel>
  )
}

function TopupAmountPanel({ open, card, onClose, onSubmit }) {
  const [amount, setAmount] = useState('')
  const amountValue = parseAmount(amount)

  useEffect(() => {
    if (open) return
    setAmount('')
  }, [open])

  if (!card) return null

  return (
    <BottomPanel open={open} onClose={onClose} title="Введите сумму">
      <div className="mb-5 rounded-xl bg-[#0d1c32] p-4">
        <p className="text-sm font-semibold text-[#d6e3ff]">{card.label}</p>
        <p className="text-xs text-[#bcc9ce]">{card.subtitle}</p>
      </div>
      <label className="mb-2 block text-sm font-medium text-[#bcc9ce]">Сумма пополнения</label>
      <div className="mb-5 flex items-baseline gap-1.5 rounded-xl bg-[#0d1c32] px-4 py-3">
        <input
          className="w-full min-w-0 bg-transparent text-lg font-bold text-[#d6e3ff] outline-none placeholder:text-[#4a5568]"
          placeholder="0"
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
        />
        <span className={UZS_AMOUNT_SUFFIX_CLASS}>UZS</span>
      </div>
      <button
        className="w-full rounded-full bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] py-3.5 text-sm font-bold text-[#00414f] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
        type="button"
        disabled={amountValue <= 0}
        onClick={() => {
          if (amountValue <= 0) return
          onSubmit(amountValue)
        }}
      >
        Отправить
      </button>
    </BottomPanel>
  )
}

function DistributePanel({ open, onClose, reserveAmount, onDistribute, initialTarget }) {
  const [step, setStep] = useState(1)
  const [targetType, setTargetType] = useState(null)
  const [targetId, setTargetId] = useState(null)
  const [amount, setAmount] = useState('')
  const [consentSent, setConsentSent] = useState(false)
  const [consents, setConsents] = useState({})

  useEffect(() => {
    if (!open) {
      setStep(1)
      setTargetType(null)
      setTargetId(null)
      setAmount('')
      setConsentSent(false)
      setConsents({})
      return
    }
    setStep(1)
    setTargetType(initialTarget?.type ?? null)
    setTargetId(initialTarget?.id ?? null)
    setAmount('')
    setConsentSent(false)
    setConsents({})
  }, [initialTarget, open])

  useEffect(() => {
    if (!consentSent) return
    const timers = MEMBER_CONTRIBUTIONS.map((m, i) =>
      setTimeout(() => setConsents((prev) => ({ ...prev, [m.id]: true })), 1200 + i * 1800)
    )
    return () => timers.forEach(clearTimeout)
  }, [consentSent])

  const allConsented = MEMBER_CONTRIBUTIONS.every((m) => consents[m.id])

  const amountValue = parseAmount(amount)

  const handleConfirm = () => {
    if (amountValue <= 0 || amountValue > reserveAmount) return
    setConsentSent(true)
    setStep(3)
  }

  return (
    <BottomPanel open={open} onClose={onClose} title="Распределить средства">
      {step === 1 && (
        <>
          <p className="mb-4 text-sm text-[#bcc9ce]">Выберите куда направить средства</p>
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#869398]">Цели</p>
            <div className="space-y-2">
              {FAMILY_GOALS_DATA.map((g) => (
                <button
                  key={g.id}
                  className={`flex w-full items-center gap-3 rounded-xl p-4 text-left transition ${
                    targetType === 'goal' && targetId === g.id
                      ? 'border-2 border-[#4cd6fb] bg-[#112036]'
                      : 'border-2 border-transparent bg-[#0d1c32] hover:bg-[#112036]'
                  }`}
                  onClick={() => { setTargetType('goal'); setTargetId(g.id) }}
                  type="button"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#112036] text-[#4cd6fb]">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>{g.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#d6e3ff]">{g.title}</p>
                    <p className="text-xs text-[#bcc9ce]">{g.progress}% собрано</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#869398]">Участники</p>
            <div className="space-y-2">
              {MEMBER_CONTRIBUTIONS.map((m) => (
                <button
                  key={m.id}
                  className={`flex w-full items-center gap-3 rounded-xl p-4 text-left transition ${
                    targetType === 'member' && targetId === m.id
                      ? 'border-2 border-[#4cd6fb] bg-[#112036]'
                      : 'border-2 border-transparent bg-[#0d1c32] hover:bg-[#112036]'
                  }`}
                  onClick={() => { setTargetType('member'); setTargetId(m.id) }}
                  type="button"
                >
                  <MemberAvatar name={m.name} color={m.color} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#d6e3ff]">{m.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          {(targetType && targetId) && (
            <button
              className="w-full rounded-full bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] py-3.5 text-sm font-bold text-[#00414f] transition hover:brightness-110 active:scale-[0.98]"
              type="button"
              onClick={() => setStep(2)}
            >
              Далее
            </button>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <p className="mb-4 text-sm text-[#bcc9ce]">
            Укажите сумму для{' '}
            {targetType === 'goal'
              ? FAMILY_GOALS_DATA.find((g) => g.id === targetId)?.title
              : MEMBER_CONTRIBUTIONS.find((m) => m.id === targetId)?.name}
          </p>
          <div className="mb-5 flex items-baseline gap-1.5 rounded-xl bg-[#0d1c32] px-4 py-3">
            <input
              className="w-full min-w-0 bg-transparent text-lg font-bold text-[#d6e3ff] outline-none placeholder:text-[#4a5568]"
              placeholder="0"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            />
            <span className={UZS_AMOUNT_SUFFIX_CLASS}>UZS</span>
          </div>
          {amountValue > reserveAmount && (
            <p className="mb-4 text-xs text-[#fda4af]">Недостаточно средств в семейном резерве.</p>
          )}
          <div className="mb-5 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-4">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5 text-[#f59e0b]" style={{ fontSize: '18px' }}>info</span>
              <p className="text-xs leading-relaxed text-[#f59e0b]/90">
                Распределение средств требует согласия всех членов семьи. После подтверждения запрос будет отправлен каждому участнику.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              className="flex-1 rounded-full border border-[#4cd6fb]/20 bg-[#27354c]/30 py-3.5 text-sm font-bold text-[#4cd6fb] transition hover:bg-[#27354c]"
              type="button"
              onClick={() => setStep(1)}
            >
              Назад
            </button>
            <button
              className="flex-1 rounded-full bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] py-3.5 text-sm font-bold text-[#00414f] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
              type="button"
              disabled={amountValue <= 0 || amountValue > reserveAmount}
              onClick={handleConfirm}
            >
              Подтвердить
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#4cd6fb]/15">
              <span className="material-symbols-outlined text-3xl text-[#4cd6fb]">how_to_reg</span>
            </div>
            <h4 className="mb-1 text-lg font-bold text-[#d6e3ff]">Ожидание согласия</h4>
            <p className="text-sm text-[#bcc9ce]">Запрос отправлен всем участникам</p>
          </div>
          <div className="mb-6 space-y-3">
            {MEMBER_CONTRIBUTIONS.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-[#0d1c32] p-4">
                <MemberAvatar name={m.name} color={m.color} size="sm" />
                <span className="flex-1 font-medium text-[#d6e3ff]">{m.name}</span>
                {consents[m.id] ? (
                  <span className="material-symbols-outlined text-[#22c55e]" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                ) : (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#4cd6fb]/30 border-t-[#4cd6fb]" />
                )}
              </div>
            ))}
          </div>
          {allConsented && (
            <button
              className="w-full rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] py-3.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
              type="button"
              onClick={() => {
                if (amountValue > 0 && amountValue <= reserveAmount && targetType && targetId) {
                  onDistribute({ amount: amountValue, targetType, targetId })
                }
                onClose()
              }}
            >
              Готово
            </button>
          )}
        </>
      )}
    </BottomPanel>
  )
}

function MemberActionsPanel({ open, member, onClose, onTransfer, onAnalytics }) {
  if (!member) return null

  const actionButtonClass =
    'min-w-0 flex-1 rounded-full bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] py-3.5 text-sm font-bold text-[#00414f] transition hover:brightness-110 active:scale-[0.98]'

  return (
    <BottomPanel open={open} onClose={onClose} title={member.name}>
      <div className="mb-5 flex flex-col items-center">
        <MemberAvatar name={member.name} color={member.color} size="lg" initial={member.avatar} />
      </div>
      <div className="flex gap-3">
        <button
          className={actionButtonClass}
          type="button"
          onClick={() => onTransfer(member)}
        >
          Перевести
        </button>
        <button
          className={actionButtonClass}
          type="button"
          onClick={() => onAnalytics(member)}
        >
          Аналитика
        </button>
      </div>
    </BottomPanel>
  )
}

/** Та же аналитика, что на /monitoring (`CostPage`), в нижнем листе. */
function BudgetAnalyticsPanel({ open, onClose }) {
  return (
    <BottomPanel open={open} onClose={onClose} sheetMaxClass="max-h-[min(92dvh,900px)]">
      <CostPage embedded mode="monitoring" onEmbeddedClose={onClose} />
    </BottomPanel>
  )
}

function TransferDetailView({ transfer, onBack }) {
  const freq = getTransferFrequency(transfer)
  const avgPerMonth = Math.round(transfer.amount * freq / 12)

  return (
    <div>
      <button className="mb-4 flex items-center gap-1 text-sm text-[#4cd6fb] transition hover:underline" onClick={onBack} type="button">
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Все переводы
      </button>

      <div className="mb-5 rounded-2xl bg-[#112036] p-5">
        <div className="mb-4 text-center">
          <p className="mb-1 text-xs uppercase tracking-widest text-[#869398]">Сумма перевода</p>
          <h3 className="text-2xl font-extrabold leading-none text-[#d6e3ff]">
            <UzsAmount as="span" className="inline-flex justify-center" compact compactFrom={1_000_000} value={String(transfer.amount)} />
          </h3>
          <p className="mt-1 text-xs text-[#bcc9ce]">{formatDate(transfer.timestamp)}</p>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-[#0d1c32] p-4">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-[#869398]">Отправитель</p>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#d6e3ff]">{transfer.from.name}</span>
              <span className="text-sm text-[#bcc9ce]">{transfer.from.bank} · *{transfer.from.cardLast4}</span>
            </div>
          </div>
          <div className="flex justify-center">
            <span className="material-symbols-outlined text-[#4cd6fb]">arrow_downward</span>
          </div>
          <div className="rounded-xl bg-[#0d1c32] p-4">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-[#869398]">Получатель</p>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#d6e3ff]">{transfer.to.name}</span>
              <span className="text-sm text-[#bcc9ce]">{transfer.to.bank} · *{transfer.to.cardLast4}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-[#0d1c32] p-4">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-[#869398]">Категория</p>
          <p className="font-semibold text-[#d6e3ff]">{transfer.category}</p>
        </div>

        {transfer.description && (
          <div className="mt-3 rounded-xl bg-[#0d1c32] p-4">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-[#869398]">Описание</p>
            <p className="text-sm text-[#d6e3ff]">{transfer.description}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-[#112036] p-5">
        <h4 className="mb-3 text-sm font-bold text-[#d6e3ff]">Аналитика переводов</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#0d1c32] p-3">
            <p className="text-[10px] uppercase tracking-widest text-[#869398]">Частота</p>
            <p className="mt-1 text-lg font-bold text-[#4cd6fb]">{freq}</p>
            <p className="text-[10px] text-[#bcc9ce]">переводов за 3 мес.</p>
          </div>
          <div className="rounded-xl bg-[#0d1c32] p-3">
            <p className="text-[10px] uppercase tracking-widest text-[#869398]">Среднее/мес</p>
            <p className="mt-1 text-lg font-bold leading-none text-[#58d6f1]">
              <UzsAmount as="span" className="inline-flex" compact compactFrom={1_000_000} value={String(avgPerMonth)} />
            </p>
            <p className="text-[10px] text-[#bcc9ce]">в среднем</p>
          </div>
          <div className="rounded-xl bg-[#0d1c32] p-3">
            <p className="text-[10px] uppercase tracking-widest text-[#869398]">Последний</p>
            <p className="mt-1 text-sm font-semibold text-[#d6e3ff]">{formatDate(transfer.timestamp).split(',')[0]}</p>
          </div>
          <div className="rounded-xl bg-[#0d1c32] p-3">
            <p className="text-[10px] uppercase tracking-widest text-[#869398]">Маршрут</p>
            <p className="mt-1 text-sm font-semibold text-[#d6e3ff]">{transfer.from.name[0]} → {transfer.to.name[0]}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TransfersPanel({ open, onClose }) {
  const [selectedTransfer, setSelectedTransfer] = useState(null)

  useEffect(() => {
    if (!open) setSelectedTransfer(null)
  }, [open])

  return (
    <BottomPanel open={open} onClose={onClose} title={selectedTransfer ? null : 'Все переводы'}>
      {selectedTransfer ? (
        <TransferDetailView transfer={selectedTransfer} onBack={() => setSelectedTransfer(null)} />
      ) : (
        <div className="space-y-2">
          {ALL_TRANSFERS.map((tr) => (
            <button
              key={tr.id}
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#112036] p-4 text-left transition hover:bg-[#1c2a41]"
              onClick={() => setSelectedTransfer(tr)}
              type="button"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#58d6f1]/10">
                  <span className="material-symbols-outlined text-[#58d6f1]">swap_horiz</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#d6e3ff]">{tr.from.name} → {tr.to.name}</p>
                  <p className="text-xs text-[#bcc9ce]">{tr.category} · {formatDate(tr.timestamp)}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <UzsAmount
                  as="span"
                  className="inline-flex justify-end text-sm font-bold leading-none text-[#d6e3ff]"
                  compact
                  compactFrom={1_000_000}
                  value={String(tr.amount)}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </BottomPanel>
  )
}

export default function FamilyGroupPage() {
  const navigate = useNavigate()
  const isUnlocked = isSessionUnlocked()
  const [reserveAmount, setReserveAmount] = useState(INITIAL_RESERVE_AMOUNT)
  const [copied, setCopied] = useState(false)
  const [showTopup, setShowTopup] = useState(false)
  const [showTopupAmount, setShowTopupAmount] = useState(false)
  const [selectedTopupCard, setSelectedTopupCard] = useState(null)
  const [showDistribute, setShowDistribute] = useState(false)
  const [showBudgetAnalytics, setShowBudgetAnalytics] = useState(false)
  const [showTransfers, setShowTransfers] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [showMemberActions, setShowMemberActions] = useState(false)
  const [distributeInitialTarget, setDistributeInitialTarget] = useState(null)
  const analyticsSectionRef = useRef(null)
  const [analyticsFilterPresetId, setAnalyticsFilterPresetId] = useState(null)
  const [analyticsFilterPresetToken, setAnalyticsFilterPresetToken] = useState(0)
  const reserveChangePct = useMemo(
    () => (((reserveAmount - LAST_MONTH_RESERVE) / LAST_MONTH_RESERVE) * 100).toFixed(1),
    [reserveAmount]
  )

  const copyInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(INVITE_LINK)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [])

  const handleTopup = useCallback((amount) => {
    setReserveAmount((prev) => prev + amount)
  }, [])

  const handleDistribute = useCallback(({ amount }) => {
    setReserveAmount((prev) => Math.max(0, prev - amount))
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#041329] pb-32 text-[#d6e3ff]" style={{ minHeight: '100dvh' }}>
      <AppTopBar />

      <main className="mx-auto mt-20 max-w-5xl px-6 pb-16">
        {/* Header */}
        <section className="mb-8">
          <div className="mb-2 flex items-center justify-between gap-3 font-headline text-3xl font-extrabold leading-tight tracking-tight text-[#d6e3ff]">
            <h1 className="min-w-0 flex-1">Семейная группа</h1>
            <SubpageCloseButton />
          </div>
          <p className="text-sm font-normal text-[#bcc9ce]">Общий бюджет, участники и переводы внутри семьи.</p>
        </section>

        {/* Участники — над семейным резервом */}
        <section className="mb-3" aria-label="Участники семейной группы">
          <div className="flex flex-wrap items-start gap-5 sm:gap-7">
            {MEMBER_CONTRIBUTIONS.map((member) => (
              <div key={member.id} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-2 sm:w-[5.25rem]">
                <button
                  type="button"
                  className="rounded-full transition hover:scale-105 active:scale-95"
                  onClick={() => {
                    setSelectedMember(member)
                    setShowMemberActions(true)
                  }}
                >
                  <MemberAvatar name={member.name} color={member.color} size="lg" initial={member.avatar} />
                </button>
                <span className="w-full truncate text-center text-xs font-medium leading-tight text-[#d6e3ff] sm:text-sm">
                  {member.name}
                </span>
              </div>
            ))}
            <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-2 sm:w-[5.25rem]">
              <button
                type="button"
                aria-label="Добавить участника"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#4cd6fb]/50 bg-[#112036]/50 text-[#4cd6fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-[#58d6f1]/70 hover:bg-[#1c2a41] hover:text-[#8de4ff] active:scale-95"
                onClick={() =>
                  document.getElementById('family-invite')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                <span
                  className="material-symbols-outlined leading-none"
                  style={{ fontSize: '1.75rem', fontVariationSettings: '"FILL" 0, "wght" 500' }}
                >
                  add
                </span>
              </button>
              <span className="min-h-[2.25rem] w-full sm:min-h-[2.5rem]" aria-hidden />
            </div>
          </div>
        </section>

        {/* Family Reserve */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-[32px] bg-[#0d1c32] p-6 md:p-8">
            <div className="pointer-events-none absolute right-5 top-5 z-[1] sm:right-8 sm:top-8">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#4cd6fb]/45 bg-[#4cd6fb]/12 shadow-[0_0_10px_rgba(76,214,251,0.22)] sm:h-12 sm:w-12"
              >
                <span
                  className="material-symbols-outlined text-[1.35rem] text-[#b8ecff] sm:text-[1.5rem]"
                  style={{
                    fontVariationSettings: "'FILL' 1",
                    filter: 'drop-shadow(0 0 3px rgba(76,214,251,0.35))',
                  }}
                >
                  account_balance_wallet
                </span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#bcc9ce]">Семейный резерв</p>
              <div className="mb-2 flex flex-wrap items-end gap-3">
                <h2 className="font-headline text-3xl font-extrabold leading-none tracking-tight text-[#d6e3ff] sm:text-5xl">
                  <UzsAmount as="span" className="inline-flex" compact compactFrom={1_000_000} value={String(reserveAmount)} />
                </h2>
                <span className="mb-1 inline-flex items-center rounded-full border border-[#4cd6fb]/30 bg-[#4cd6fb]/10 px-3 py-1 text-xs font-semibold text-[#8de4ff]">
                  +{reserveChangePct}%
                </span>
              </div>
              <p className="mb-6 text-xs text-[#bcc9ce]">
                По сравнению с прошлым месяцем (
                <UzsAmount as="span" className="inline-flex" compact compactFrom={1_000_000} value={String(LAST_MONTH_RESERVE)} />)
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] px-6 py-3 text-sm font-bold text-[#00414f] transition hover:brightness-110 active:scale-95 sm:px-8"
                  type="button"
                  onClick={() => {
                    setSelectedTopupCard(null)
                    setShowTopupAmount(false)
                    setShowTopup(true)
                  }}
                >
                  Пополнить
                </button>
                <button
                  className="rounded-full border border-[#4cd6fb]/20 bg-[#27354c]/30 px-6 py-3 text-sm font-bold text-[#4cd6fb] backdrop-blur transition hover:bg-[#27354c] active:scale-95 sm:px-8"
                  type="button"
                  onClick={() => setShowDistribute(true)}
                >
                  Распределить
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Аналитика: заголовок и CostPage в одной карточке */}
        <section ref={analyticsSectionRef} className="mb-10 min-w-0">
          <div className={`${FAMILY_CARD_SHELL} min-w-0`}>
            <div className="mb-6">
              <h2 className="font-headline text-2xl font-bold text-[#d6e3ff]">Аналитика</h2>
              <p className="mt-1 text-sm text-[#bcc9ce]">
                Диаграмма расходов и доходов с категориями и историей операций
              </p>
            </div>
            <CostPage
              embedded
              embeddedInline
              embeddedInlineContained
              mode="monitoring"
              filterByFamilyMember
              externalAccountFilterId={analyticsFilterPresetId}
              externalAccountFilterToken={analyticsFilterPresetToken}
            />
          </div>
        </section>

        {/* Budget Contributions & Goals row */}
        <section className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Вклад в бюджет */}
          <div className={`${FAMILY_CARD_SHELL} md:col-span-2 lg:col-span-2`}>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-headline text-2xl font-bold text-[#d6e3ff]">Вклад в бюджет</h2>
              <CircleArrowButton
                ariaLabel="Подробнее: аналитика вкладов"
                onClick={() => setShowBudgetAnalytics(true)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              {MEMBER_CONTRIBUTIONS.map((m) => (
                <div key={m.id} className="flex items-center gap-4 rounded-xl bg-[#112036] p-5">
                  <MemberAvatar name={m.name} color={m.color} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#d6e3ff]">{m.name}</p>
                    <p className="text-sm font-semibold leading-none text-[#58d6f1]">
                      <UzsAmount as="span" className="inline-flex" compact compactFrom={1_000_000} value={String(m.amount)} />
                    </p>
                  </div>
                  <div className="shrink-0 rounded bg-[#4cd6fb]/10 px-2 py-1 text-[10px] font-bold text-[#4cd6fb]">
                    {m.pct}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Цели */}
          <div
            className={`${FAMILY_CARD_SHELL} cursor-pointer transition hover:bg-[#112036]`}
            onClick={() => navigate('/goal', { state: { from: '/family', fromScrollY: window.scrollY } })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) =>
              e.key === 'Enter' && navigate('/goal', { state: { from: '/family', fromScrollY: window.scrollY } })
            }
          >
            <div className="mb-8 flex items-center justify-between gap-3">
              <h2 className="font-headline text-2xl font-bold text-[#d6e3ff]">Цели</h2>
              <CircleArrowButton
                ariaLabel="Открыть цели"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate('/goal', { state: { from: '/family', fromScrollY: window.scrollY } })
                }}
              />
            </div>
            <div className="space-y-8">
              {FAMILY_GOALS_DATA.map((g) => (
                <div key={g.id}>
                  <div className="mb-3 flex justify-between text-sm">
                    <span className="font-medium text-[#d6e3ff]">{g.title}</span>
                    <span className="font-bold text-[#4cd6fb]">{g.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#27354c]">
                    <div className="h-full bg-gradient-to-r from-[#4cd6fb] to-[#58d6f1]" style={{ width: `${g.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Internal Transfers */}
        <section className={`mb-10 ${FAMILY_CARD_SHELL}`}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-headline text-2xl font-bold text-[#d6e3ff]">Внутренние переводы</h2>
            <CircleArrowButton
              ariaLabel="Подробнее: все внутренние переводы"
              onClick={() => setShowTransfers(true)}
            />
          </div>
          <p className="mb-8 text-sm text-[#bcc9ce]">Транзакции внутри семейного круга</p>
          <div className="space-y-4">
            {ALL_TRANSFERS.slice(0, 2).map((tr) => (
              <div
                key={tr.id}
                className="flex items-center justify-between gap-4 rounded-xl bg-[#112036] p-4 transition hover:bg-[#1c2a41]"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#58d6f1]/10">
                    <span className="material-symbols-outlined text-[#58d6f1]">swap_horiz</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#d6e3ff]">{tr.from.name} → {tr.to.name}</p>
                    <p className="text-xs text-[#bcc9ce]">{tr.category}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <UzsAmount
                    as="span"
                    className="inline-flex justify-end font-bold leading-none text-[#d6e3ff]"
                    compact
                    compactFrom={1_000_000}
                    value={String(tr.amount)}
                  />
                  <p className="text-xs text-[#bcc9ce]">{formatDate(tr.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Invite Section — at the very end */}
        <section id="family-invite" className={FAMILY_CARD_SHELL}>
          <h2 className="mb-4 font-headline text-xl font-bold text-[#d6e3ff]">Пригласить участника</h2>
          <p className="mb-6 text-sm leading-relaxed text-[#bcc9ce]">
            Поделитесь ссылкой, чтобы добавить нового члена семьи в общее пространство.
          </p>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#010e24] p-4">
            <code className="min-w-0 flex-1 truncate text-xs text-[#4cd6fb]">{INVITE_LINK}</code>
            <button
              aria-label={copied ? 'Скопировано' : 'Копировать ссылку'}
              className="material-symbols-outlined shrink-0 text-[#4cd6fb] transition hover:scale-110"
              type="button"
              onClick={copyInvite}
            >
              {copied ? 'check' : 'content_copy'}
            </button>
          </div>
        </section>
      </main>

      {/* Panels */}
      <CardSelectPanel
        open={showTopup}
        onClose={() => {
          setShowTopup(false)
          setShowTopupAmount(false)
          setSelectedTopupCard(null)
        }}
        onCardPick={(card) => {
          setSelectedTopupCard(card)
          setShowTopupAmount(true)
        }}
      />
      <TopupAmountPanel
        open={showTopupAmount}
        card={selectedTopupCard}
        onClose={() => {
          setShowTopupAmount(false)
          setSelectedTopupCard(null)
        }}
        onSubmit={(amount) => {
          handleTopup(amount)
          setShowTopupAmount(false)
          setShowTopup(false)
          setSelectedTopupCard(null)
        }}
      />
      <DistributePanel
        open={showDistribute}
        onClose={() => {
          setShowDistribute(false)
          setDistributeInitialTarget(null)
        }}
        reserveAmount={reserveAmount}
        onDistribute={handleDistribute}
        initialTarget={distributeInitialTarget}
      />
      <MemberActionsPanel
        open={showMemberActions}
        member={selectedMember}
        onClose={() => setShowMemberActions(false)}
        onTransfer={(member) => {
          setShowMemberActions(false)
          setDistributeInitialTarget({ type: 'member', id: member.id })
          setShowDistribute(true)
        }}
        onAnalytics={(member) => {
          setShowMemberActions(false)
          setAnalyticsFilterPresetId(member.id)
          setAnalyticsFilterPresetToken((token) => token + 1)
          window.requestAnimationFrame(() => {
            analyticsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          })
        }}
      />
      <BudgetAnalyticsPanel open={showBudgetAnalytics} onClose={() => setShowBudgetAnalytics(false)} />
      <TransfersPanel open={showTransfers} onClose={() => setShowTransfers(false)} />

      <AppBottomNav activeTab="monitoring" isUnlocked={isUnlocked} />
    </div>
  )
}
