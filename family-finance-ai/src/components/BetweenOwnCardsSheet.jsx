import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CardSourceSelect from './CardSourceSelect'
import { formatGroupedAmountInput, parseGroupedAmountString } from '../utils/amountInputFormat'

const BANK_REJECT_CHANCE = 0.05

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

export default function BetweenOwnCardsSheet({ isOpen, onClose, allUserCards = [], rates = null, onComplete }) {
  const [isClosing, setIsClosing] = useState(false)
  const [view, setView] = useState('form')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [outcome, setOutcome] = useState(null)
  const sheetWasOpenRef = useRef(false)

  const destCards = useMemo(
    () => (allUserCards ?? []).filter((c) => c.id !== fromId),
    [allUserCards, fromId],
  )

  const sourceCard = useMemo(() => (allUserCards ?? []).find((c) => c.id === fromId) ?? null, [allUserCards, fromId])
  const destCard = useMemo(() => (allUserCards ?? []).find((c) => c.id === toId) ?? null, [allUserCards, toId])

  useEffect(() => {
    if (!isOpen) {
      sheetWasOpenRef.current = false
      return
    }
    if (!sheetWasOpenRef.current) {
      sheetWasOpenRef.current = true
      setIsClosing(false)
      setView('form')
      setOutcome(null)
      setAmountInput('')
      const list = allUserCards ?? []
      const f = list[0]?.id ?? ''
      setFromId(f)
      const t = list.find((c) => c.id !== f)?.id ?? ''
      setToId(t)
    }
  }, [isOpen, allUserCards])

  useEffect(() => {
    if (!isOpen || !fromId) return
    setToId((prev) => {
      const opts = (allUserCards ?? []).filter((c) => c.id !== fromId)
      if (opts.some((c) => c.id === prev)) return prev
      return opts[0]?.id ?? ''
    })
  }, [isOpen, fromId, allUserCards])

  const requestClose = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setIsClosing(true)
  }, [onClose])

  const handlePanelAnimEnd = (e) => {
    if (e.target !== e.currentTarget || !isClosing) return
    onClose()
  }

  const handleDone = useCallback(() => {
    requestClose()
  }, [requestClose])

  useEffect(() => {
    if (!isOpen) return
    const h = (e) => {
      if (e.key === 'Escape') {
        if (outcome) {
          handleDone()
          return
        }
        if (view === 'confirm') {
          setView('form')
          return
        }
        requestClose()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, requestClose, view, outcome, handleDone])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  const availableUzs = useMemo(() => availableUzsOnCard(sourceCard, rates), [sourceCard, rates])
  const amount = parseGroupedAmountString(amountInput)
  const amountExceedsBalance = amount > 0 && amount > availableUzs
  const distinctCards = Boolean(fromId && toId && fromId !== toId)
  const canGoConfirm =
    distinctCards && amount > 0 && !amountExceedsBalance && destCards.length > 0

  const handleAmountChange = (e) => {
    setAmountInput(formatGroupedAmountInput(e.target.value, 0))
  }

  const handleMaxAmount = () => {
    if (availableUzs <= 0 || !fromId) return
    setAmountInput(formatGroupedAmountInput(String(Math.floor(availableUzs)), 0))
  }

  const handleConfirmPay = () => {
    if (!canGoConfirm || !sourceCard || !destCard) return
    const rejected = Math.random() < BANK_REJECT_CHANCE
    if (rejected) {
      setOutcome({ kind: 'bank_error', amount })
      return
    }
    const debitSource = debitInCardCurrency(amount, sourceCard, rates)
    const creditDest = creditInCardCurrency(amount, destCard, rates)
    onComplete?.({
      sourceId: fromId,
      destId: toId,
      amountUzs: amount,
      sourceCard,
      destCard,
      debitSource,
      creditDest,
    })
    setOutcome({ kind: 'success', amount })
  }

  if (!isOpen) return null

  const hasEnoughCards = (allUserCards ?? []).length >= 2

  return (
    <div className="fixed inset-0 z-[125] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        type="button"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
          isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'
        }`}
        onClick={requestClose}
      />

      <div
        className={`relative z-10 flex h-[min(92dvh,680px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:h-auto sm:max-h-[min(92dvh,720px)] sm:max-w-lg sm:rounded-3xl ${
          isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'
        }`}
        onAnimationEnd={handlePanelAnimEnd}
        role="dialog"
        aria-modal="true"
        aria-labelledby="between-own-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2 id="between-own-title" className="font-headline text-lg font-bold text-[#d6e3ff]">
            Между своими
          </h2>
          <button
            type="button"
            aria-label="Закрыть"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
          {!hasEnoughCards ? (
            <p className="rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-6 text-center text-sm text-[#bcc9ce]">
              Нужно минимум две карты или счёта для перевода между своими.
            </p>
          ) : view === 'confirm' ? (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-[#bcc9ce]">Проверьте данные и подтвердите перевод.</p>
              <div className="space-y-4 rounded-2xl border border-[#1c2a41] bg-[#112036] p-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#869398]">Списание</p>
                  <p className="mt-1 font-semibold text-[#d6e3ff]">{sourceCard?.sheetTitle}</p>
                  <p className="text-sm text-[#5c6b73]">•••• {sourceCard?.last4}</p>
                </div>
                <div className="flex justify-center">
                  <span className="material-symbols-outlined text-[#4cd6fb]">south</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#869398]">Зачисление</p>
                  <p className="mt-1 font-semibold text-[#d6e3ff]">{destCard?.sheetTitle}</p>
                  <p className="text-sm text-[#5c6b73]">•••• {destCard?.last4}</p>
                </div>
                <div className="border-t border-[#1c2a41] pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#869398]">Сумма</p>
                  <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#4cd6fb]">
                    {formatGroupedAmountInput(String(amount), 0)}
                    <span className="ml-1 text-lg font-bold text-[#58d6f1]">UZS</span>
                  </p>
                  <p className="mt-1 text-xs text-[#5c6b73]">Комиссия 0 UZS</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setView('form')}
                  className="flex-1 rounded-2xl border border-[#1c2a41] py-3.5 text-sm font-bold text-[#bcc9ce] transition-colors hover:bg-[#112036]"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPay}
                  className="flex-1 rounded-2xl bg-[#4cd6fb] py-3.5 text-sm font-bold text-[#071021] transition-all hover:bg-[#6ee0fc] active:scale-[0.98]"
                >
                  Подтвердить оплату
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <CardSourceSelect
                cards={allUserCards}
                value={fromId}
                onChange={setFromId}
                label="Откуда списать"
              />
              <CardSourceSelect
                cards={destCards}
                value={toId}
                onChange={setToId}
                label="Куда зачислить"
                className="mb-5 mt-2"
              />
              {destCards.length === 0 ? (
                <p className="mb-4 text-sm text-amber-400/90">Выберите другую карту списания.</p>
              ) : null}

              <div className="mb-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">Сумма</p>
                <div className="flex items-center gap-2 rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    value={amountInput}
                    onChange={handleAmountChange}
                    className="min-w-0 flex-1 bg-transparent text-base tabular-nums text-[#d6e3ff] outline-none placeholder:text-[#3a4a5a]"
                  />
                  <button
                    type="button"
                    onClick={handleMaxAmount}
                    disabled={availableUzs <= 0 || !fromId}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-[#4cd6fb] transition-colors hover:bg-[#4cd6fb]/10 disabled:pointer-events-none disabled:opacity-30"
                  >
                    max
                  </button>
                  <span className="shrink-0 text-sm font-semibold text-[#5c6b73]">сум</span>
                </div>
                {amountExceedsBalance ? (
                  <p className="mt-2 text-sm text-red-400">Сумма больше доступного баланса</p>
                ) : null}
                {fromId && availableUzs <= 0 ? (
                  <p className="mt-2 text-sm text-red-400">Недостаточно средств на выбранной карте</p>
                ) : null}
              </div>

              <button
                type="button"
                disabled={!canGoConfirm}
                onClick={() => setView('confirm')}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4cd6fb] py-3.5 text-sm font-bold text-[#071021] transition-all hover:bg-[#6ee0fc] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                Перевести
              </button>
            </div>
          )}
        </div>

        {outcome ? (
          <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-[#071021] px-5 pb-8 pt-10">
            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center">
              {outcome.kind === 'success' ? (
                <>
                  <div className="relative mb-5">
                    <div className="absolute inset-0 scale-150 rounded-full bg-[#4cd6fb]/25 blur-xl" aria-hidden />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#112036] shadow-[0_0_0_8px_rgba(76,214,251,0.35)] ring-2 ring-[#4cd6fb]/80">
                      <span
                        className="material-symbols-outlined text-[56px] text-[#4cd6fb]"
                        style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}
                      >
                        check
                      </span>
                    </div>
                  </div>
                  <p className="mb-6 text-center text-sm font-medium text-[#bcc9ce]">Перевод выполнен</p>
                </>
              ) : (
                <>
                  <div className="relative mb-5">
                    <div className="absolute inset-0 scale-150 rounded-full bg-red-500/20 blur-xl" aria-hidden />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#7f1d1d] shadow-[0_0_0_8px_rgba(239,68,68,0.28)] ring-2 ring-red-500/70">
                      <span
                        className="material-symbols-outlined text-[56px] text-red-400"
                        style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}
                      >
                        close
                      </span>
                    </div>
                  </div>
                  <p className="mb-2 text-center text-base font-semibold text-[#d6e3ff]">Операция не выполнена</p>
                  <p className="mb-6 text-center text-sm leading-relaxed text-[#bcc9ce]">
                    Банк отклонил перевод. Попробуйте позже.
                  </p>
                </>
              )}

              <div className="mb-6 w-full rounded-2xl border border-[#1c2a41] bg-[#112036] px-5 py-5 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-[#869398]">Между своими</p>
                <p className="mt-3 text-sm text-[#bcc9ce]">
                  {sourceCard?.sheetTitle} · •••• {sourceCard?.last4}
                </p>
                <p className="my-2 text-[#4cd6fb]">↓</p>
                <p className="text-sm text-[#bcc9ce]">
                  {destCard?.sheetTitle} · •••• {destCard?.last4}
                </p>
              </div>

              <p
                className={`mb-1 text-4xl font-extrabold tabular-nums ${
                  outcome.kind === 'bank_error' ? 'text-[#94a3b8]' : 'text-[#4cd6fb]'
                }`}
              >
                {formatGroupedAmountInput(String(outcome.amount), 0)}
                <span
                  className={`ml-1 align-top text-lg font-bold ${
                    outcome.kind === 'bank_error' ? 'text-[#64748b]' : 'text-[#58d6f1]'
                  }`}
                >
                  UZS
                </span>
              </p>
              <p className="mb-8 text-xs text-[#5c6b73]">
                {outcome.kind === 'success' ? 'Комиссия 0 UZS' : 'Средства не списаны'}
              </p>

              <button
                type="button"
                onClick={handleDone}
                className="mt-auto w-full rounded-2xl bg-[#4cd6fb] py-3.5 text-sm font-bold text-[#071021] transition-all hover:bg-[#6ee0fc] active:scale-[0.98]"
              >
                Закрыть
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
