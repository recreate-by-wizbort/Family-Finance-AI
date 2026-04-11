import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  formatGroupedAmountInput,
  parseGroupedAmountString,
} from '../utils/amountInputFormat'

function formatBalance(value, currency = 'UZS') {
  const n = Number(value ?? 0)
  const formatted = n.toLocaleString('ru-RU', {
    minimumFractionDigits: currency === 'UZS' ? 0 : 2,
    maximumFractionDigits: currency === 'UZS' ? 0 : 2,
  })
  return `${formatted} ${currency}`
}

function getSourceBalance(source, type) {
  if (type === 'deposit') return Number(source.amount ?? 0)
  return Number(source.balance ?? source.balanceUzs ?? 0)
}

function getSourceCurrency(source, type) {
  if (type === 'deposit') return source.currency ?? 'UZS'
  return source.currency ?? 'UZS'
}

export default function CardTopUpSheet({
  isOpen,
  onClose,
  targetCard,
  allUserCards = [],
  deposits = [],
  onTopUpComplete,
}) {
  const [activeTab, setActiveTab] = useState('card')
  const [selectedSource, setSelectedSource] = useState(null)
  const [selectedType, setSelectedType] = useState(null)
  const [amountRaw, setAmountRaw] = useState('')
  const [isClosing, setIsClosing] = useState(false)

  const otherCards = useMemo(
    () => allUserCards.filter((c) => c.id !== targetCard?.id),
    [allUserCards, targetCard?.id],
  )

  const requestClose = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      onClose()
      return
    }
    setIsClosing(true)
  }, [onClose])

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('card')
      setSelectedSource(null)
      setSelectedType(null)
      setAmountRaw('')
      setIsClosing(false)
      return
    }
    setIsClosing(false)
  }, [isOpen])

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
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (selectedSource) {
          setSelectedSource(null)
          setSelectedType(null)
          setAmountRaw('')
          return
        }
        if (!isClosing) requestClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, requestClose, selectedSource, isClosing])

  const handleSelectCard = useCallback((card) => {
    setSelectedSource(card)
    setSelectedType('card')
    setAmountRaw('')
  }, [])

  const handleSelectDeposit = useCallback((deposit) => {
    setSelectedSource(deposit)
    setSelectedType('deposit')
    setAmountRaw('')
  }, [])

  const handleBack = useCallback(() => {
    setSelectedSource(null)
    setSelectedType(null)
    setAmountRaw('')
  }, [])

  const maxDecimals = selectedSource
    ? getSourceCurrency(selectedSource, selectedType) === 'UZS'
      ? 0
      : 2
    : 0

  const handleAmountChange = useCallback(
    (e) => {
      setAmountRaw(formatGroupedAmountInput(e.target.value, maxDecimals))
    },
    [maxDecimals],
  )

  const parsedAmount = parseGroupedAmountString(amountRaw)
  const sourceBalance = selectedSource
    ? getSourceBalance(selectedSource, selectedType)
    : 0
  const sourceCurrency = selectedSource
    ? getSourceCurrency(selectedSource, selectedType)
    : 'UZS'
  const isValid = parsedAmount > 0 && parsedAmount <= sourceBalance

  const handleSubmit = useCallback(() => {
    if (!isValid || !selectedSource || !onTopUpComplete) return
    onTopUpComplete(selectedSource.id, selectedType, parsedAmount)
    requestClose()
  }, [isValid, selectedSource, selectedType, parsedAmount, onTopUpComplete, requestClose])

  const handlePanelAnimationEnd = useCallback(
    (e) => {
      if (e.target !== e.currentTarget) return
      if (!isClosing) return
      onClose()
    },
    [isClosing, onClose],
  )

  if (!isOpen || !targetCard) return null

  const isAccountTarget = targetCard.kind === 'account'

  const tabs = [
    { id: 'card', label: 'Карта или счёт' },
    { id: 'deposit', label: 'Вклад' },
  ]

  return (
    <div className="fixed inset-0 z-[130] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
          isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'
        }`}
        onClick={requestClose}
        type="button"
      />

      <div
        aria-labelledby="topup-sheet-title"
        aria-modal="true"
        className={`relative z-10 flex h-[min(82dvh,640px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:h-[min(82dvh,640px)] sm:max-w-lg sm:rounded-3xl ${
          isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'
        }`}
        onAnimationEnd={handlePanelAnimationEnd}
        role="dialog"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <div className="min-w-0 pr-4">
            <h2
              className="font-headline text-lg font-bold leading-snug text-[#d6e3ff]"
              id="topup-sheet-title"
            >
              {isAccountTarget ? 'Пополнение счёта' : 'Пополнение карты'}
            </h2>
            <p className="mt-0.5 truncate text-xs text-[#bcc9ce]">
              {targetCard.sheetTitle} · •••• {targetCard.last4}
            </p>
          </div>
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-6 pt-4">
          {selectedSource ? (
            /* ── Amount entry ── */
            <div className="flex flex-1 flex-col">
              <button
                className="mb-4 flex shrink-0 items-center gap-1.5 text-sm text-[#4cd6fb] hover:underline"
                onClick={handleBack}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Назад
              </button>

              <div className="mb-5 shrink-0 rounded-2xl border border-[#4cd6fb]/15 bg-[#112036] p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#4cd6fb]/80">
                  {selectedType === 'deposit'
                    ? 'Источник — вклад'
                    : isAccountTarget
                      ? 'Источник — карта или счёт'
                      : 'Источник — карта'}
                </p>
                <p className="text-sm font-semibold text-[#d6e3ff]">
                  {selectedType === 'deposit'
                    ? `Вклад ${selectedSource.rate}% · ${sourceCurrency}`
                    : `${selectedSource.sheetTitle} · •••• ${selectedSource.last4}`}
                </p>
                <p className="mt-1 text-xs text-[#bcc9ce]">
                  Доступно: {formatBalance(sourceBalance, sourceCurrency)}
                </p>
              </div>

              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
                {isAccountTarget ? 'Сумма зачисления на счёт' : 'Сумма пополнения'}
              </label>
              <div className="relative mb-2 shrink-0">
                <input
                  autoFocus
                  className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-lg font-semibold tabular-nums text-[#d6e3ff] outline-none placeholder:text-[#5c6b73] focus:border-[#4cd6fb]/50"
                  inputMode="decimal"
                  onChange={handleAmountChange}
                  placeholder="0"
                  type="text"
                  value={amountRaw}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#5c6b73]">
                  {sourceCurrency}
                </span>
              </div>
              {parsedAmount > sourceBalance && (
                <p className="mb-2 text-xs text-[#ffb4ab]">
                  Сумма превышает доступный баланс
                </p>
              )}

              <div className="mt-auto pt-4">
                <button
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-colors ${
                    isValid
                      ? 'bg-[#003642] text-[#4cd6fb] hover:opacity-90'
                      : 'cursor-not-allowed bg-[#112036] text-[#5c6b73]'
                  }`}
                  disabled={!isValid}
                  onClick={handleSubmit}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                  {isAccountTarget ? 'Пополнить счёт' : 'Пополнить'}
                </button>
              </div>
            </div>
          ) : (
            /* ── Source selection ── */
            <>
              <div className="mb-3 flex shrink-0 gap-1 rounded-xl bg-[#0d1c32] p-1">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    className={
                      activeTab === t.id
                        ? 'flex-1 rounded-lg bg-[#112036] py-2 text-xs font-bold text-[#4cd6fb]'
                        : 'flex-1 rounded-lg py-2 text-xs font-medium text-[#bcc9ce] hover:text-[#d6e3ff]'
                    }
                    onClick={() => setActiveTab(t.id)}
                    type="button"
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                {activeTab === 'card' ? (
                  <ul className="space-y-2 pb-1">
                    {otherCards.length === 0 ? (
                      <li className="rounded-xl bg-[#112036] px-4 py-6 text-center text-sm text-[#bcc9ce]">
                        Нет доступных карт или счетов
                      </li>
                    ) : (
                      otherCards.map((c) => {
                        const bal = getSourceBalance(c, 'card')
                        const cur = getSourceCurrency(c, 'card')
                        return (
                          <li key={c.id}>
                            <button
                              className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#112036] px-4 py-3 text-left transition-colors hover:bg-[#172a44]"
                              onClick={() => handleSelectCard(c)}
                              type="button"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-[#d6e3ff]">
                                  {c.sheetTitle}
                                </p>
                                <p className="mt-0.5 text-xs text-[#5c6b73]">
                                  •••• {c.last4}
                                </p>
                              </div>
                              <p className="shrink-0 text-sm font-bold tabular-nums text-[#58d6f1]">
                                {formatBalance(bal, cur)}
                              </p>
                            </button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                ) : (
                  <ul className="space-y-2 pb-1">
                    {deposits.length === 0 ? (
                      <li className="rounded-xl bg-[#112036] px-4 py-6 text-center text-sm text-[#bcc9ce]">
                        Нет доступных вкладов
                      </li>
                    ) : (
                      deposits.map((d) => {
                        const cur = d.currency ?? 'UZS'
                        return (
                          <li key={d.id}>
                            <button
                              className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#112036] px-4 py-3 text-left transition-colors hover:bg-[#172a44]"
                              onClick={() => handleSelectDeposit(d)}
                              type="button"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-[#d6e3ff]">
                                  Вклад {d.rate}% · {cur}
                                </p>
                              </div>
                              <p className="shrink-0 text-sm font-bold tabular-nums text-[#58d6f1]">
                                {formatBalance(d.amount, cur)}
                              </p>
                            </button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
