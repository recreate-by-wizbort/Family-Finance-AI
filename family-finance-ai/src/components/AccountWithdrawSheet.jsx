import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  formatGroupedAmountInput,
  parseGroupedAmountString,
} from '../utils/amountInputFormat'

function availableUzsOnCard(card, rates) {
  if (!card) return 0
  if (card.foreignCurrency && rates?.[card.foreignCurrency]?.rate) {
    const r = rates[card.foreignCurrency].rate
    const v = (card.balanceForeign ?? 0) * r
    return Math.max(0, Math.round(v * 100) / 100)
  }
  return Math.max(0, Number(card.balanceUzs) || 0)
}

function debitInCardCurrency(amountUzs, card, rates) {
  if (!card?.foreignCurrency || !rates?.[card.foreignCurrency]?.rate) return amountUzs
  const r = rates[card.foreignCurrency].rate
  if (!r) return amountUzs
  return Math.round((amountUzs / r) * 10000) / 10000
}

function creditInCardCurrency(amountUzs, card, rates) {
  if (!card?.foreignCurrency || !rates?.[card.foreignCurrency]?.rate) return amountUzs
  const r = rates[card.foreignCurrency].rate
  if (!r) return amountUzs
  return Math.round((amountUzs / r) * 10000) / 10000
}

export default function AccountWithdrawSheet({
  isOpen,
  onClose,
  accountRow,
  allUserCards = [],
  rates = null,
  onWithdrawComplete,
}) {
  const [isClosing, setIsClosing] = useState(false)
  const [destCard, setDestCard] = useState(null)
  const [amountRaw, setAmountRaw] = useState('')

  const destOptions = useMemo(
    () => (allUserCards ?? []).filter((c) => c.id !== accountRow?.id),
    [allUserCards, accountRow?.id],
  )

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false)
      setDestCard(null)
      setAmountRaw('')
      return
    }
    setIsClosing(false)
    setDestCard(null)
    setAmountRaw('')
  }, [isOpen, accountRow?.id])

  const requestClose = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setIsClosing(true)
  }, [onClose])

  const handlePanelAnimEnd = useCallback(
    (e) => {
      if (e.target !== e.currentTarget || !isClosing) return
      onClose()
    },
    [isClosing, onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const h = (e) => {
      if (e.key === 'Escape') {
        if (destCard) {
          setDestCard(null)
          setAmountRaw('')
          return
        }
        if (!isClosing) requestClose()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, requestClose, destCard, isClosing])

  const availableUzs = useMemo(
    () => availableUzsOnCard(accountRow, rates),
    [accountRow, rates],
  )

  const parsedAmount = parseGroupedAmountString(amountRaw)
  const amountExceeds = parsedAmount > 0 && parsedAmount > availableUzs
  const canSubmit =
    Boolean(destCard && accountRow) && parsedAmount > 0 && !amountExceeds && availableUzs > 0

  const handleSubmit = useCallback(() => {
    if (!canSubmit || !accountRow || !destCard || !onWithdrawComplete) return
    const debitFromAccount = debitInCardCurrency(parsedAmount, accountRow, rates)
    const creditToDest = creditInCardCurrency(parsedAmount, destCard, rates)
    onWithdrawComplete({
      accountRow,
      amountUzs: parsedAmount,
      destCard,
      debitFromAccount,
      creditToDest,
    })
    requestClose()
  }, [canSubmit, accountRow, destCard, parsedAmount, rates, onWithdrawComplete, requestClose])

  if (!isOpen || !accountRow) return null

  return (
    <div className="fixed inset-0 z-[130] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        type="button"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
          isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'
        }`}
        onClick={requestClose}
      />

      <div
        aria-labelledby="acc-withdraw-title"
        aria-modal="true"
        className={`relative z-10 flex h-[min(82dvh,640px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:max-w-lg sm:rounded-3xl ${
          isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'
        }`}
        onAnimationEnd={handlePanelAnimEnd}
        role="dialog"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <div className="min-w-0 pr-4">
            <h2 id="acc-withdraw-title" className="font-headline text-lg font-bold text-[#d6e3ff]">
              Снятие со счёта
            </h2>
            <p className="mt-0.5 truncate text-xs text-[#bcc9ce]">
              {accountRow.sheetTitle} · •••• {accountRow.last4}
            </p>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-6 pt-4">
          {destCard ? (
            <div className="flex flex-1 flex-col">
              <button
                type="button"
                className="mb-4 flex shrink-0 items-center gap-1.5 text-sm text-[#4cd6fb] hover:underline"
                onClick={() => {
                  setDestCard(null)
                  setAmountRaw('')
                }}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Назад
              </button>

              <div className="mb-5 shrink-0 rounded-2xl border border-[#4cd6fb]/15 bg-[#112036] p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#4cd6fb]/80">
                  Зачисление на карту или счёт
                </p>
                <p className="text-sm font-semibold text-[#d6e3ff]">
                  {destCard.sheetTitle} · •••• {destCard.last4}
                </p>
              </div>

              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
                Сумма списания
              </label>
              <div className="relative mb-2 shrink-0">
                <input
                  autoFocus
                  className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-lg font-semibold tabular-nums text-[#d6e3ff] outline-none placeholder:text-[#5c6b73] focus:border-[#4cd6fb]/50"
                  inputMode="numeric"
                  onChange={(e) => setAmountRaw(formatGroupedAmountInput(e.target.value, 0))}
                  placeholder="0"
                  type="text"
                  value={amountRaw}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#5c6b73]">
                  сум
                </span>
              </div>
              <p className="mb-2 text-xs text-[#5c6b73]">
                Доступно: {Math.floor(availableUzs).toLocaleString('ru-RU')} сум
              </p>
              {amountExceeds ? (
                <p className="mb-2 text-xs text-[#ffb4ab]">Сумма больше остатка на счёте</p>
              ) : null}

              <div className="mt-auto pt-4">
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-colors ${
                    canSubmit
                      ? 'bg-[#003642] text-[#4cd6fb] hover:opacity-90'
                      : 'cursor-not-allowed bg-[#112036] text-[#5c6b73]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                  Снять со счёта
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <p className="mb-3 text-sm text-[#bcc9ce]">Выберите карту или счёт зачисления</p>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                <ul className="space-y-2 pb-1">
                  {destOptions.length === 0 ? (
                    <li className="rounded-xl bg-[#112036] px-4 py-6 text-center text-sm text-[#bcc9ce]">
                      Нет доступных карт или счетов
                    </li>
                  ) : (
                    destOptions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#112036] px-4 py-3 text-left transition-colors hover:bg-[#172a44]"
                          onClick={() => setDestCard(c)}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#d6e3ff]">{c.sheetTitle}</p>
                            <p className="mt-0.5 text-xs text-[#5c6b73]">•••• {c.last4}</p>
                          </div>
                          <span className="material-symbols-outlined shrink-0 text-[#5c6b73]">
                            chevron_right
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
