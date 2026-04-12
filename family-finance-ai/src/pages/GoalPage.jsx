import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppBottomNav from '../components/AppBottomNav'
import AppTopBar from '../components/AppTopBar'
import SubpageCloseButton, { SUBPAGE_CLOSE_BUTTON_CLASS } from '../components/SubpageCloseButton'
import UzsAmount, { UZS_AMOUNT_SUFFIX_CLASS } from '../components/UzsAmount.jsx'
import { isSessionUnlocked } from '../utils/sessionLock'
import { formatUzsGroupedRu } from '../utils.js'
import { formatGroupedAmountInput, parseGroupedAmountString } from '../utils/amountInputFormat'
import { pickGoalIconFromText } from '../utils/goalIconFromText'
import { loadUserCreatedGoals, saveUserCreatedGoals } from '../utils/userGoalsPersist'
import { computeAllUserCards } from '../utils/buildHomeUserCardsList'
import { loadCardBalanceDeltas } from '../utils/cardBalanceDeltas'
import { loadUserAccounts } from '../utils/accounts'
import { loadCardRenames, loadUserLinkedCards } from '../utils/homeCardsPersist'
import { loadPrimaryCardId, loadRemovedRowIds } from '../utils/deletedCards'
import { debitCardForGoalTopup, getSpendableUzsForReserve } from '../utils/familyReserveDebit'
import { loadFamilyReserveBalance, debitFamilyReserveForGoal } from '../utils/familyReservePersist'
import {
  addToPresetGoalSaved,
  appendGoalTransaction,
  getPresetGoalSaved,
  loadGoalTransactionsMap,
} from '../utils/goalFinancePersist'
import { PRESET_FINANCIAL_GOALS as PRESET_GOALS } from '../data/presetFinancialGoals'

const PANEL_ANIM_MS = 320

const PRESET_IDS = new Set(PRESET_GOALS.map((g) => g.id))

function formatDate(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 86_400_000) return `Сегодня, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  if (diff < 172_800_000) return `Вчера, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Склонение для «N месяцев» (длительность). */
function formatDurationMonths(n) {
  if (n == null || !Number.isFinite(n) || n <= 0) return null
  const x = Math.min(Math.ceil(n), 9999)
  const mod100 = x % 100
  const mod10 = x % 10
  if (mod100 >= 11 && mod100 <= 14) return `${x} месяцев`
  if (mod10 === 1) return `${x} месяц`
  if (mod10 >= 2 && mod10 <= 4) return `${x} месяца`
  return `${x} месяцев`
}

function formatEtaRemaining(remainingUzs, monthlyUzs) {
  if (remainingUzs <= 0) return 'Цель достигнута'
  if (!monthlyUzs || monthlyUzs <= 0) return '—'
  return formatDurationMonths(remainingUzs / monthlyUzs) ?? '—'
}

function GoalBottomPanel({ open, onClose, title, children, sheetMaxClass = 'max-h-[92dvh]' }) {
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
    <div className="fixed inset-0 z-[130] flex flex-col justify-end overscroll-none">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${animating ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: `${PANEL_ANIM_MS}ms` }}
        onClick={onClose}
        role="presentation"
      />
      <div
        className={`relative z-10 flex ${sheetMaxClass} min-h-0 w-full flex-col rounded-t-[28px] border-t border-[#3d494d] bg-[#010e24]/98 shadow-[0_-12px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-transform ${
          animating ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ transitionDuration: `${PANEL_ANIM_MS}ms`, transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        <div className="shrink-0 px-5 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#4cd6fb]/30" />
          {title ? (
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="min-w-0 flex-1 font-headline text-xl font-bold leading-tight text-[#d6e3ff]">{title}</h3>
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
          ) : null}
        </div>
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
      </div>
    </div>
  )
}

function GoalCard({ goal, onOpen }) {
  const target = Number(goal.targetUzs) || 0
  const saved = Number(goal.savedUzs) || 0
  const monthly = Number(goal.monthlyUzs) || 0
  const progress = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0
  const remaining = Math.max(0, target - saved)
  const savedStr = `${formatUzsGroupedRu(saved)} UZS`
  const monthlyStr = `${formatUzsGroupedRu(monthly)} UZS`
  const etaStr = formatEtaRemaining(remaining, monthly)

  return (
    <button
      className="w-full rounded-[28px] bg-[#0d1c32] p-5 text-left transition hover:bg-[#112036] active:scale-[0.99] sm:p-6"
      type="button"
      onClick={() => onOpen(goal)}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#112036] text-[#4cd6fb]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
              {goal.icon || pickGoalIconFromText(goal.title)}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-[#d6e3ff]">{goal.title}</h2>
            <p className="truncate text-xs text-[#bcc9ce]">
              {goal.subtitle?.trim()
                ? goal.subtitle
                : String(goal.id).startsWith('ug_')
                  ? 'Добавлено вручную'
                  : '\u00a0'}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-extrabold text-[#4cd6fb]">{progress}%</p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#869398]">Прогресс</p>
        </div>
      </div>

      <div className="mb-5 h-3 w-full overflow-hidden rounded-full bg-[#27354c]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#4cd6fb] to-[#58d6f1]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#112036] p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#869398]">Накоплено</p>
          <p className="mt-1 text-sm font-semibold text-[#d6e3ff]">{savedStr}</p>
        </div>
        <div className="rounded-2xl bg-[#112036] p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#869398]">Ежемесячно</p>
          <p className="mt-1 text-sm font-semibold text-[#58d6f1]">{monthlyStr}</p>
        </div>
        <div className="rounded-2xl bg-[#112036] p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-[#869398]">Осталось</p>
          <p className="mt-1 text-sm font-semibold text-[#d6e3ff]">{etaStr}</p>
        </div>
      </div>
    </button>
  )
}

function GoalDetailSheet({
  open,
  goal,
  onClose,
  setUserGoals,
  onPersist,
}) {
  const [view, setView] = useState('main')
  const [topupMenu, setTopupMenu] = useState(false)
  const [amountRaw, setAmountRaw] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)
  const [cardBalanceDeltas, setCardBalanceDeltas] = useState(() => loadCardBalanceDeltas())
  const [userAccounts, setUserAccounts] = useState(() => loadUserAccounts())
  const [userLinkedCards, setUserLinkedCards] = useState(() => loadUserLinkedCards())
  const [renamedLabels, setRenamedLabels] = useState(() => loadCardRenames())
  const [historyTick, setHistoryTick] = useState(0)

  useEffect(() => {
    if (!open || !goal) return
    setView('main')
    setTopupMenu(false)
    setAmountRaw('')
    setSelectedCard(null)
  }, [open, goal?.id])

  useEffect(() => {
    if (!open) return undefined
    const sync = () => {
      setCardBalanceDeltas(loadCardBalanceDeltas())
      setUserAccounts(loadUserAccounts())
      setUserLinkedCards(loadUserLinkedCards())
      setRenamedLabels(loadCardRenames())
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') sync()
    }
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [open])

  const cardRows = useMemo(
    () =>
      computeAllUserCards({
        cardBalanceDeltas,
        removedRowIds: loadRemovedRowIds(),
        primaryCardId: loadPrimaryCardId(),
        renamedLabels,
        userLinkedCards,
        userAccounts,
      }),
    [cardBalanceDeltas, renamedLabels, userAccounts, userLinkedCards],
  )

  const history = useMemo(() => {
    if (!goal) return []
    void historyTick
    const map = loadGoalTransactionsMap()
    const list = Array.isArray(map[goal.id]) ? map[goal.id] : []
    return [...list].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
  }, [goal?.id, historyTick])

  const handlePanelClose = () => {
    if (view !== 'main') {
      setView('main')
      setTopupMenu(false)
      setAmountRaw('')
      setSelectedCard(null)
      return
    }
    onClose()
  }

  const amountUzs = Math.round(parseGroupedAmountString(amountRaw))

  const applyTopup = (source, cardRow) => {
    if (!goal || amountUzs <= 0) return
    const target = Number(goal.targetUzs) || 0
    const saved = Number(goal.savedUzs) || 0
    const cap = Math.max(0, target - saved)
    const pay = Math.min(amountUzs, cap)
    if (pay <= 0) return

    if (source === 'card') {
      if (!cardRow) return
      const r = debitCardForGoalTopup(cardRow, pay, goal.title)
      if (!r.ok) return
    } else {
      const r = debitFamilyReserveForGoal(pay)
      if (!r.ok) return
    }

    if (PRESET_IDS.has(goal.id)) {
      const base = PRESET_GOALS.find((g) => g.id === goal.id).savedUzs
      addToPresetGoalSaved(goal.id, pay, base)
    } else {
      setUserGoals((prev) => {
        const next = prev.map((g) =>
          g.id === goal.id ? { ...g, savedUzs: (Number(g.savedUzs) || 0) + pay } : g,
        )
        saveUserCreatedGoals(next)
        return next
      })
    }

    appendGoalTransaction(goal.id, {
      kind: 'in',
      source,
      amount: pay,
      detail:
        source === 'card' && cardRow
          ? `Карта «${cardRow.sheetTitle}» · ${cardRow.processingSystem} *${cardRow.last4}`
          : 'Семейный резерв',
      timestamp: new Date().toISOString(),
    })

    onPersist()
    setHistoryTick((t) => t + 1)
    setView('main')
    setTopupMenu(false)
    setAmountRaw('')
    setSelectedCard(null)
    setCardBalanceDeltas(loadCardBalanceDeltas())
    setUserAccounts(loadUserAccounts())
  }

  if (!goal) return null

  const target = Number(goal.targetUzs) || 0
  const saved = Number(goal.savedUzs) || 0
  const remaining = Math.max(0, target - saved)
  const reserveBal = loadFamilyReserveBalance()

  const panelTitle =
    view === 'cards'
      ? 'Карта для пополнения'
      : view === 'amountCard'
        ? 'Сумма с карты'
        : view === 'amountReserve'
          ? 'С семейного резерва'
          : goal.title

  const maxAmountReserve = Math.min(remaining, reserveBal)
  const maxAmountCard =
    selectedCard != null ? Math.min(remaining, getSpendableUzsForReserve(selectedCard)) : remaining

  return (
    <GoalBottomPanel open={open} onClose={handlePanelClose} title={panelTitle} sheetMaxClass="max-h-[92dvh]">
      {view === 'main' ? (
        <>
          <div className="mb-5 rounded-2xl bg-[#0d1c32] p-5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#869398]">Накоплено</p>
            <p className="font-headline text-2xl font-extrabold leading-snug text-[#d6e3ff] sm:text-3xl">
              {formatUzsGroupedRu(saved)} UZS
            </p>
            <p className="mt-3 text-xs text-[#bcc9ce]">
              Цель: {formatUzsGroupedRu(target)} UZS · осталось набрать {formatUzsGroupedRu(remaining)} UZS
            </p>
          </div>

          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#869398]">
            История пополнений
          </p>
          <div className="mb-6 space-y-2">
            {history.length === 0 ? (
              <p className="rounded-xl bg-[#112036] p-4 text-center text-sm text-[#869398]">Пока нет операций</p>
            ) : (
              history.map((e) => (
                <div key={e.id} className="flex gap-3 rounded-xl bg-[#112036] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4cd6fb]/12">
                    <span
                      className="material-symbols-outlined text-[#58d6f1]"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                    >
                      {e.source === 'reserve' ? 'groups' : 'credit_card'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#d6e3ff]">Пополнение</p>
                    <p className="text-xs text-[#bcc9ce]">{e.detail}</p>
                    <p className="mt-1 text-[10px] text-[#869398]">{formatDate(e.timestamp)}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm font-bold text-[#58d6f1]">
                    +<UzsAmount as="span" className="inline-flex justify-end" value={String(e.amount)} />
                  </div>
                </div>
              ))
            )}
          </div>

          {!topupMenu ? (
            <button
              className="w-full rounded-full bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] py-3.5 text-sm font-bold text-[#00414f] transition hover:brightness-110 active:scale-[0.98]"
              type="button"
              onClick={() => setTopupMenu(true)}
            >
              Пополнить
            </button>
          ) : (
            <div className="space-y-3">
              <button
                className="w-full rounded-full border border-[#4cd6fb]/35 bg-[#0d1c32] py-3.5 text-sm font-bold text-[#4cd6fb] transition hover:bg-[#112036]"
                type="button"
                onClick={() => {
                  setTopupMenu(false)
                  setView('cards')
                }}
              >
                Пополнить со своей карты
              </button>
              <button
                className="w-full rounded-full border border-[#4cd6fb]/35 bg-[#0d1c32] py-3.5 text-sm font-bold text-[#4cd6fb] transition hover:bg-[#112036]"
                type="button"
                onClick={() => {
                  setTopupMenu(false)
                  setView('amountReserve')
                }}
              >
                Пополнение с семейного резерва
              </button>
              <button
                className="w-full py-2 text-sm font-medium text-[#869398] transition hover:text-[#bcc9ce]"
                type="button"
                onClick={() => setTopupMenu(false)}
              >
                Отмена
              </button>
            </div>
          )}
        </>
      ) : null}

      {view === 'cards' ? (
        <>
          <button
            className="mb-4 flex items-center gap-1 text-sm text-[#4cd6fb]"
            type="button"
            onClick={() => setView('main')}
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Назад
          </button>
          <p className="mb-4 text-sm text-[#bcc9ce]">Выберите карту списания</p>
          <div className="space-y-3">
            {cardRows.map((row) => {
              const spendable = getSpendableUzsForReserve(row)
              const disabled = spendable <= 0
              const accent = row.accentColor ?? '#4cd6fb'
              return (
                <button
                  key={row.id}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 border-transparent bg-[#0d1c32] p-4 text-left transition ${
                    disabled ? 'cursor-not-allowed opacity-45' : 'hover:bg-[#112036]'
                  }`}
                  disabled={disabled}
                  type="button"
                  onClick={() => {
                    setSelectedCard(row)
                    setView('amountCard')
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${accent}22` }}
                  >
                    <span
                      className="material-symbols-outlined text-lg"
                      style={{ color: accent, fontVariationSettings: '"FILL" 1' }}
                    >
                      {row.kind === 'account' ? 'account_balance_wallet' : 'credit_card'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#d6e3ff]">{row.sheetTitle}</p>
                    <p className="text-xs text-[#bcc9ce]">
                      {row.processingSystem} *{row.last4}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : null}

      {view === 'amountCard' && selectedCard ? (
        <>
          <button
            className="mb-4 flex items-center gap-1 text-sm text-[#4cd6fb]"
            type="button"
            onClick={() => {
              setView('cards')
              setAmountRaw('')
            }}
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            К списку карт
          </button>
          <p className="mb-2 text-xs text-[#bcc9ce]">
            Доступно: {formatUzsGroupedRu(maxAmountCard)} UZS · к цели осталось {formatUzsGroupedRu(remaining)} UZS
          </p>
          <label className="mb-2 block text-xs font-medium text-[#869398]">Сумма</label>
          <div className="mb-4 flex items-baseline gap-2 rounded-xl border border-[#27354c] bg-[#0d1c32] px-4 py-3">
            <input
              className="min-w-0 flex-1 bg-transparent text-lg font-bold tabular-nums text-[#d6e3ff] outline-none"
              inputMode="numeric"
              placeholder="0"
              type="text"
              value={amountRaw}
              onChange={(e) => setAmountRaw(formatGroupedAmountInput(e.target.value, 0))}
            />
            <span className={UZS_AMOUNT_SUFFIX_CLASS}>UZS</span>
          </div>
          {amountUzs > maxAmountCard ? (
            <p className="mb-4 text-xs text-[#fda4af]">Сумма больше доступного лимита.</p>
          ) : null}
          <button
            className="w-full rounded-full bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] py-3.5 text-sm font-bold text-[#00414f] disabled:opacity-40"
            disabled={amountUzs <= 0 || amountUzs > maxAmountCard}
            type="button"
            onClick={() => applyTopup('card', selectedCard)}
          >
            Пополнить цель
          </button>
        </>
      ) : null}

      {view === 'amountReserve' ? (
        <>
          <button
            className="mb-4 flex items-center gap-1 text-sm text-[#4cd6fb]"
            type="button"
            onClick={() => {
              setView('main')
              setAmountRaw('')
            }}
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Назад
          </button>
          <p className="mb-2 text-xs text-[#bcc9ce]">
            В семейном резерве: {formatUzsGroupedRu(reserveBal)} UZS · к цели можно добавить не больше{' '}
            {formatUzsGroupedRu(maxAmountReserve)} UZS
          </p>
          <label className="mb-2 block text-xs font-medium text-[#869398]">Сумма</label>
          <div className="mb-4 flex items-baseline gap-2 rounded-xl border border-[#27354c] bg-[#0d1c32] px-4 py-3">
            <input
              className="min-w-0 flex-1 bg-transparent text-lg font-bold tabular-nums text-[#d6e3ff] outline-none"
              inputMode="numeric"
              placeholder="0"
              type="text"
              value={amountRaw}
              onChange={(e) => setAmountRaw(formatGroupedAmountInput(e.target.value, 0))}
            />
            <span className={UZS_AMOUNT_SUFFIX_CLASS}>UZS</span>
          </div>
          {amountUzs > maxAmountReserve ? (
            <p className="mb-4 text-xs text-[#fda4af]">Недостаточно средств в резерве или превышен остаток цели.</p>
          ) : null}
          <button
            className="w-full rounded-full bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] py-3.5 text-sm font-bold text-[#00414f] disabled:opacity-40"
            disabled={amountUzs <= 0 || amountUzs > maxAmountReserve}
            type="button"
            onClick={() => applyTopup('reserve', null)}
          >
            Списать с резерва и пополнить цель
          </button>
        </>
      ) : null}
    </GoalBottomPanel>
  )
}

function AddGoalSheet({ open, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [targetRaw, setTargetRaw] = useState('')
  const [monthlyRaw, setMonthlyRaw] = useState('')

  useEffect(() => {
    if (open) return
    setTitle('')
    setTargetRaw('')
    setMonthlyRaw('')
  }, [open])

  const targetUzs = Math.round(parseGroupedAmountString(targetRaw))
  const monthlyUzs = Math.round(parseGroupedAmountString(monthlyRaw))

  const monthsToFullGoal =
    targetUzs > 0 && monthlyUzs > 0 ? Math.ceil(targetUzs / monthlyUzs) : null
  const durationLabel = monthsToFullGoal != null ? formatDurationMonths(monthsToFullGoal) : null

  const canSave =
    title.trim().length > 0 && targetUzs > 0 && monthlyUzs > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({
      icon: pickGoalIconFromText(title),
      title: title.trim(),
      subtitle: '',
      targetUzs,
      savedUzs: 0,
      monthlyUzs,
    })
    onClose()
  }

  const inputClass =
    'w-full rounded-xl border border-[#27354c] bg-[#0d1c32] px-4 py-3 text-[#d6e3ff] outline-none transition placeholder:text-[#4a5568] focus:border-[#4cd6fb]/50'

  return (
    <GoalBottomPanel open={open} onClose={onClose} title="Новая цель">
      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#869398]">Какая цель</label>
      <input
        className={`${inputClass} mb-5`}
        placeholder="Например: накопить на отпуск"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoComplete="off"
      />

      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#869398]">Сумма для достижения</label>
      <div className="mb-5 flex items-baseline gap-2 rounded-xl border border-[#27354c] bg-[#0d1c32] px-4 py-3">
        <input
          className="min-w-0 flex-1 bg-transparent text-lg font-bold tabular-nums text-[#d6e3ff] outline-none placeholder:text-[#4a5568]"
          inputMode="numeric"
          placeholder="0"
          type="text"
          value={targetRaw}
          onChange={(e) => setTargetRaw(formatGroupedAmountInput(e.target.value, 0))}
        />
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-[#9fb2c4]">UZS</span>
      </div>

      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#869398]">Ежемесячный взнос</label>
      <div className="mb-5 flex items-baseline gap-2 rounded-xl border border-[#27354c] bg-[#0d1c32] px-4 py-3">
        <input
          className="min-w-0 flex-1 bg-transparent text-lg font-bold tabular-nums text-[#58d6f1] outline-none placeholder:text-[#4a5568]"
          inputMode="numeric"
          placeholder="0"
          type="text"
          value={monthlyRaw}
          onChange={(e) => setMonthlyRaw(formatGroupedAmountInput(e.target.value, 0))}
        />
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-[#9fb2c4]">UZS</span>
      </div>

      <div
        className={`mb-6 rounded-2xl border p-4 ${
          durationLabel
            ? 'border-[#4cd6fb]/35 bg-[#4cd6fb]/8'
            : 'border-[#27354c] bg-[#112036]/60'
        }`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#869398]">Срок накопления</p>
        {durationLabel ? (
          <p className="mt-2 text-sm font-bold leading-snug text-[#d6e3ff]">
            При таком взносе цель распределится примерно на{' '}
            <span className="text-[#58d6f1]">{durationLabel}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-[#869398]">Укажите целевую сумму и ежемесячный взнос — покажем ориентировочный срок.</p>
        )}
      </div>

      <button
        className="w-full rounded-full bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] py-3.5 text-sm font-bold text-[#00414f] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canSave}
        type="button"
        onClick={handleSave}
      >
        Сохранить цель
      </button>
    </GoalBottomPanel>
  )
}

export default function GoalPage() {
  const isUnlocked = isSessionUnlocked()
  const location = useLocation()
  const navigate = useNavigate()
  const cameFromFamily = location.state?.from === '/family'
  const fromScrollY = Number(location.state?.fromScrollY) || 0

  const [userGoals, setUserGoals] = useState(() => loadUserCreatedGoals())
  const [addOpen, setAddOpen] = useState(false)
  const [detailGoal, setDetailGoal] = useState(null)
  const [persistTick, setPersistTick] = useState(0)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  const allGoals = useMemo(() => {
    void persistTick
    const presets = PRESET_GOALS.map((g) => ({
      ...g,
      savedUzs: getPresetGoalSaved(g.id, g.savedUzs),
    }))
    return [...presets, ...userGoals]
  }, [userGoals, persistTick])

  const handleSaveNewGoal = useCallback((payload) => {
    setUserGoals((prev) => {
      const id = `ug_${Date.now()}`
      const next = [...prev, { ...payload, id }]
      saveUserCreatedGoals(next)
      return next
    })
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

  const openDetail = useCallback((g) => {
    const fresh = allGoals.find((x) => x.id === g.id) ?? g
    setDetailGoal(fresh)
  }, [allGoals])

  const handleDetailClose = useCallback(() => {
    setDetailGoal(null)
  }, [])

  const bumpPersist = useCallback(() => {
    setPersistTick((t) => t + 1)
    setDetailGoal((prev) => {
      if (!prev) return null
      if (PRESET_IDS.has(prev.id)) {
        const base = PRESET_GOALS.find((x) => x.id === prev.id)
        return { ...prev, ...base, savedUzs: getPresetGoalSaved(prev.id, base.savedUzs) }
      }
      const ug = loadUserCreatedGoals().find((x) => x.id === prev.id)
      return ug ? { ...prev, ...ug } : prev
    })
  }, [])

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
            className="inline-flex items-center gap-2 rounded-full border border-[#4cd6fb]/35 bg-gradient-to-br from-[#4cd6fb] to-[#00b4d8] px-5 py-2.5 text-sm font-bold text-[#00414f] shadow-lg shadow-[#4cd6fb]/15 transition hover:brightness-110 active:scale-95"
            type="button"
            onClick={() => setAddOpen(true)}
          >
            <span className="material-symbols-outlined text-base">add</span>
            Добавить цель
          </button>
        </section>

        <section className="grid grid-cols-1 gap-4">
          {allGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onOpen={openDetail} />
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[#58d6f1]/20 bg-[#0d1c32] px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-[#d6e3ff]">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#58d6f1] shadow-[0_0_10px_#58d6f1]" />
            Общий прогресс по целям вырос на 2.4% в этом месяце
          </div>
        </section>
      </main>

      <AddGoalSheet open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSaveNewGoal} />

      <GoalDetailSheet
        open={detailGoal != null}
        goal={detailGoal}
        onClose={handleDetailClose}
        setUserGoals={setUserGoals}
        onPersist={bumpPersist}
      />

      <AppBottomNav activeTab="monitoring" isUnlocked={isUnlocked} />
    </div>
  )
}
