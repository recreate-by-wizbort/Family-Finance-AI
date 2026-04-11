import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CardSourceSelect from './CardSourceSelect'
import { formatGroupedAmountInput, parseGroupedAmountString } from '../utils/amountInputFormat'
import { validateLinkedCardPanForTransfer } from '../utils/cardBin'
import {
  addFavoriteRecipient,
  isRecipientInFavorites,
  removeFavoriteRecipientByIdentifier,
} from '../utils/favoriteRecipients'
import { formatCardNumber, formatPhoneAfterPrefix } from '../utils/transferRecipientFormat'

/** Вероятность имитации отказа банка (без списания средств). */
const BANK_REJECT_CHANCE = 0.05

const RECIPIENT_NAMES = [
  'Aziz Karimov',
  'Dilshod Raximov',
  'Nodira Alimova',
  'Sanjar Jumayev',
  'Malika Toshpulatova',
  'Rustam Xolmatov',
  'Gulnora Usmanova',
  'Bekzod Mirzayev',
]

function hashDigits(digits) {
  let h = 0
  for (let i = 0; i < digits.length; i++) {
    h = (h * 31 + digits.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

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

export default function CardTransferSheet({
  isOpen,
  onClose,
  allUserCards,
  preselectedCardId,
  /** 'card' | 'phone' — какой режим открыть при открытии листа */
  initialTab = 'card',
  onTransferComplete,
  /** Курсы валют (как на главной) — для счетов в USD/EUR и лимита «max» в сумах */
  rates = null,
  /** Быстрый перевод из избранного: фиксированный получатель */
  pinnedRecipient = null,
  /** После добавления в избранное — обновить список у родителя (опционально) */
  onAddToFavorites = null,
}) {
  const [isClosing, setIsClosing] = useState(false)
  const [tab, setTab] = useState(initialTab === 'phone' ? 'phone' : 'card')
  const [cardInput, setCardInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [sourceCardId, setSourceCardId] = useState(preselectedCardId ?? '')
  const [outcomeOpen, setOutcomeOpen] = useState(false)
  /** @type {null | { kind: 'success' | 'bank_error', amount: number, recipientName: string, recipientIdentifier: string, method: string, recipientBank: string | null }} */
  const [transferOutcome, setTransferOutcome] = useState(null)
  const [favoritesRevision, setFavoritesRevision] = useState(0)
  const sheetWasOpenRef = useRef(false)

  useEffect(() => {
    const bump = () => setFavoritesRevision((n) => n + 1)
    window.addEventListener('family-finance-favorites-changed', bump)
    return () => window.removeEventListener('family-finance-favorites-changed', bump)
  }, [])

  // Сбрасываем форму только при открытии листа, а не при обновлении allUserCards после перевода
  // (иначе экран успеха сразу гаснет).
  useEffect(() => {
    if (!isOpen) {
      sheetWasOpenRef.current = false
      return
    }
    if (!sheetWasOpenRef.current) {
      sheetWasOpenRef.current = true
      setIsClosing(false)
      setCardInput('')
      setPhoneInput('')
      setAmountInput('')
      setSourceCardId(preselectedCardId ?? allUserCards?.[0]?.id ?? '')
      setOutcomeOpen(false)
      setTransferOutcome(null)
      if (pinnedRecipient) {
        setTab(pinnedRecipient.method === 'phone' ? 'phone' : 'card')
        if (pinnedRecipient.method === 'card' && pinnedRecipient.cardDigits) {
          setCardInput(formatCardNumber(String(pinnedRecipient.cardDigits).replace(/\D/g, '').slice(0, 16)))
        }
        if (pinnedRecipient.method === 'phone' && pinnedRecipient.phoneDigits) {
          setPhoneInput(formatPhoneAfterPrefix(String(pinnedRecipient.phoneDigits).replace(/\D/g, '').slice(0, 9)))
        }
      } else {
        setTab(initialTab === 'phone' ? 'phone' : 'card')
      }
    }
  }, [isOpen, preselectedCardId, allUserCards, initialTab, pinnedRecipient])

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

  useEffect(() => {
    if (!isOpen) return
    const h = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, requestClose])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  const cardDigits = useMemo(() => cardInput.replace(/\D/g, ''), [cardInput])
  const phoneDigits = useMemo(() => phoneInput.replace(/\D/g, ''), [phoneInput])

  const cardPanCheck = useMemo(() => validateLinkedCardPanForTransfer(cardDigits), [cardDigits])

  const recipientNameCard = useMemo(
    () => (cardPanCheck.ok ? RECIPIENT_NAMES[hashDigits(cardDigits) % RECIPIENT_NAMES.length] : null),
    [cardDigits, cardPanCheck.ok],
  )

  const recipientNamePhone = useMemo(
    () => (phoneDigits.length === 9 ? RECIPIENT_NAMES[hashDigits(phoneDigits) % RECIPIENT_NAMES.length] : null),
    [phoneDigits],
  )

  const resolvedRecipientName = useMemo(() => {
    if (pinnedRecipient?.name) return pinnedRecipient.name
    return tab === 'card' ? recipientNameCard : recipientNamePhone
  }, [pinnedRecipient, tab, recipientNameCard, recipientNamePhone])

  const recipientReady = useMemo(() => {
    if (pinnedRecipient) {
      if (pinnedRecipient.method === 'card') return cardPanCheck.ok
      return phoneDigits.length === 9
    }
    return tab === 'card' ? cardPanCheck.ok : phoneDigits.length === 9
  }, [pinnedRecipient, tab, cardPanCheck.ok, phoneDigits.length])

  const sourceCard = useMemo(
    () => (allUserCards ?? []).find((c) => c.id === sourceCardId) ?? null,
    [allUserCards, sourceCardId],
  )

  const availableUzs = useMemo(() => availableUzsOnCard(sourceCard, rates), [sourceCard, rates])

  const recipientAlreadyInFavorites = useMemo(() => {
    if (!outcomeOpen || !transferOutcome || transferOutcome.kind !== 'success') return false
    const m = transferOutcome.method
    return isRecipientInFavorites({
      method: m,
      cardDigits: m === 'card' ? cardDigits : undefined,
      phoneDigits: m === 'phone' ? phoneDigits : undefined,
    })
  }, [outcomeOpen, transferOutcome, cardDigits, phoneDigits, favoritesRevision])

  const amount = parseGroupedAmountString(amountInput)
  const amountExceedsBalance = recipientReady && amount > 0 && amount > availableUzs
  const canSubmit =
    recipientReady && amount > 0 && !amountExceedsBalance && Boolean(sourceCardId)

  const handleCardChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
    setCardInput(formatCardNumber(raw))
  }

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 9)
    setPhoneInput(formatPhoneAfterPrefix(raw))
  }

  const handleAmountChange = (e) => {
    setAmountInput(formatGroupedAmountInput(e.target.value, 0))
  }

  const handleMaxAmount = () => {
    if (availableUzs <= 0) return
    setAmountInput(formatGroupedAmountInput(String(Math.floor(availableUzs)), 0))
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    const method = pinnedRecipient ? pinnedRecipient.method : tab
    const recipientIdentifier =
      method === 'card' ? formatCardNumber(cardDigits) : `+998 ${formatPhoneAfterPrefix(phoneDigits)}`

    const baseOutcome = {
      amount,
      recipientName: resolvedRecipientName,
      recipientIdentifier,
      method,
      recipientBank: method === 'card' ? cardPanCheck.bank : null,
    }

    const bankRejected = Math.random() < BANK_REJECT_CHANCE
    if (bankRejected) {
      setTransferOutcome({ kind: 'bank_error', ...baseOutcome })
      setOutcomeOpen(true)
      return
    }

    const debit = debitInCardCurrency(amount, sourceCard, rates)
    setTransferOutcome({ kind: 'success', ...baseOutcome })
    setOutcomeOpen(true)
    onTransferComplete?.(sourceCardId, amount, debit, sourceCard)
  }

  const handleDone = () => {
    requestClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[125] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
          isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'
        }`}
        onClick={requestClose}
        type="button"
      />

      <div
        className={`relative z-10 flex h-[min(92dvh,680px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:h-auto sm:max-h-[min(92dvh,720px)] sm:max-w-lg sm:rounded-3xl ${
          isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'
        }`}
        onAnimationEnd={handlePanelAnimEnd}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-transfer-title"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2
            id="card-transfer-title"
            className="font-headline text-lg font-bold text-[#d6e3ff]"
          >
            Перевод
          </h2>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
            type="button"
            aria-label="Закрыть"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
          {pinnedRecipient ? (
            <div className="mb-5 rounded-xl border border-[#1c2a41] bg-[#112036] p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#869398]">Получатель</p>
              <p className="text-lg font-bold text-[#d6e3ff]">{pinnedRecipient.name}</p>
              <p className="mt-1 text-sm font-medium text-[#4cd6fb]">
                {pinnedRecipient.method === 'phone' ? 'По номеру телефона' : 'По номеру карты'}
              </p>
              <p className="mt-2 font-mono text-sm tabular-nums text-[#bcc9ce]">
                {pinnedRecipient.method === 'phone'
                  ? `+998 ${formatPhoneAfterPrefix(pinnedRecipient.phoneDigits)}`
                  : formatCardNumber(pinnedRecipient.cardDigits)}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex gap-1 rounded-xl bg-[#112036] p-1">
                <button
                  type="button"
                  className={`flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                    tab === 'card'
                      ? 'bg-[#4cd6fb]/15 text-[#4cd6fb]'
                      : 'text-[#5c6b73] hover:text-[#bcc9ce]'
                  }`}
                  onClick={() => setTab('card')}
                >
                  По номеру карты
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                    tab === 'phone'
                      ? 'bg-[#4cd6fb]/15 text-[#4cd6fb]'
                      : 'text-[#5c6b73] hover:text-[#bcc9ce]'
                  }`}
                  onClick={() => setTab('phone')}
                >
                  По номеру телефона
                </button>
              </div>

              {tab === 'card' && (
                <div className="mb-5">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
                    Номер карты
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0000 0000 0000 0000"
                    value={cardInput}
                    onChange={handleCardChange}
                    maxLength={19}
                    className="w-full rounded-xl border border-[#4cd6fb]/35 bg-[#112036] px-4 py-3 text-base tabular-nums text-[#d6e3ff] outline-none transition-colors placeholder:text-[#3a4a5a] hover:border-[#4cd6fb]/55 focus:border-[#4cd6fb]/70 focus:ring-2 focus:ring-[#4cd6fb]/20"
                  />
                  {cardDigits.length === 16 && cardPanCheck.message ? (
                    <p className="mt-2 text-sm text-red-400">{cardPanCheck.message}</p>
                  ) : null}
                  {cardPanCheck.ok ? (
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3">
                      <span className="material-symbols-outlined text-[28px] text-[#4cd6fb]">person</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#d6e3ff]">{recipientNameCard}</p>
                        <p className="mt-0.5 text-xs text-[#5c6b73]">
                          {cardPanCheck.bank ? <>{cardPanCheck.bank} · </> : null}
                          {cardPanCheck.system ? <>{cardPanCheck.system} · </> : null}
                          •••• {cardDigits.slice(-4)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {tab === 'phone' && (
                <div className="mb-5">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
                    Номер телефона
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#4cd6fb]/35 bg-[#112036] px-4 py-3 transition-colors hover:border-[#4cd6fb]/55 focus-within:border-[#4cd6fb]/70 focus-within:ring-2 focus-within:ring-[#4cd6fb]/20">
                    <span className="shrink-0 text-base font-semibold text-[#5c6b73]">+998</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="XX XXX XX XX"
                      value={phoneInput}
                      onChange={handlePhoneChange}
                      maxLength={12}
                      className="w-full bg-transparent text-base tabular-nums text-[#d6e3ff] outline-none placeholder:text-[#3a4a5a]"
                    />
                  </div>
                  {phoneDigits.length === 9 && (
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3">
                      <span className="material-symbols-outlined text-[28px] text-[#4cd6fb]">person</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#d6e3ff]">{recipientNamePhone}</p>
                        <p className="mt-0.5 text-xs text-[#5c6b73]">
                          +998 {formatPhoneAfterPrefix(phoneDigits)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Amount */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
              Сумма
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-[#4cd6fb]/35 bg-[#112036] px-4 py-3 transition-colors hover:border-[#4cd6fb]/55 focus-within:border-[#4cd6fb]/70 focus-within:ring-2 focus-within:ring-[#4cd6fb]/20">
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amountInput}
                onChange={handleAmountChange}
                className="min-w-0 flex-1 bg-transparent text-base tabular-nums text-[#d6e3ff] outline-none placeholder:text-[#3a4a5a]"
              />
              <button
                type="button"
                onClick={handleMaxAmount}
                disabled={availableUzs <= 0 || !sourceCardId}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-[#4cd6fb] transition-colors hover:bg-[#4cd6fb]/10 disabled:pointer-events-none disabled:opacity-30"
              >
                max
              </button>
              <span className="shrink-0 text-sm font-semibold text-[#5c6b73]">сум</span>
            </div>
            {amountExceedsBalance ? (
              <p className="mt-2 text-sm text-red-400">Сумма больше доступного баланса карты</p>
            ) : null}
            {recipientReady && sourceCardId && availableUzs <= 0 ? (
              <p className="mt-2 text-sm text-red-400">Недостаточно средств на выбранной карте</p>
            ) : null}
          </div>

          {/* Card source */}
          <CardSourceSelect
            cards={allUserCards ?? []}
            value={sourceCardId}
            onChange={setSourceCardId}
          />

          {/* Submit */}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4cd6fb] py-3.5 text-sm font-bold text-[#071021] transition-all hover:bg-[#6ee0fc] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
            Перевести
          </button>
        </div>

        {/* Результат перевода: успех (синяя галочка) или отказ банка ~5% (красный крест) */}
        {outcomeOpen && transferOutcome && (
          <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-[#071021] px-5 pb-8 pt-10">
            <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center">
              {transferOutcome.kind === 'success' ? (
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
                  <p className="mb-6 text-center text-sm font-medium text-[#bcc9ce]">Вы успешно перевели деньги</p>
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
                  <p className="mb-2 text-center text-base font-semibold text-[#d6e3ff]">Перевод не выполнен</p>
                  <p className="mb-6 text-center text-sm leading-relaxed text-[#bcc9ce]">
                    Банк отклонил операцию. Повторите попытку позже или обратитесь в поддержку.
                  </p>
                </>
              )}

              <div
                className={`mb-6 w-full rounded-2xl border border-[#1c2a41] bg-[#112036] px-5 py-5 text-center ${
                  transferOutcome.kind === 'bank_error' ? 'opacity-90' : ''
                }`}
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1c2a41]">
                  <span
                    className={`material-symbols-outlined text-2xl ${
                      transferOutcome.kind === 'bank_error' ? 'text-red-400/90' : 'text-[#4cd6fb]'
                    }`}
                  >
                    account_balance
                  </span>
                </div>
                {transferOutcome.recipientBank ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#869398]">{transferOutcome.recipientBank}</p>
                ) : (
                  <p className="text-xs font-bold uppercase tracking-wide text-[#869398]">
                    {transferOutcome.method === 'phone' ? 'По номеру телефона' : 'По номеру карты'}
                  </p>
                )}
                <p className="mt-2 break-words text-base font-bold uppercase leading-snug tracking-wide text-[#d6e3ff]">
                  {String(transferOutcome.recipientName).toUpperCase()}
                </p>
                <p className="mt-1 font-mono text-sm tabular-nums text-[#bcc9ce]">{transferOutcome.recipientIdentifier}</p>
              </div>

              <p
                className={`mb-1 text-4xl font-extrabold tabular-nums ${
                  transferOutcome.kind === 'bank_error' ? 'text-[#94a3b8]' : 'text-[#4cd6fb]'
                }`}
              >
                {formatGroupedAmountInput(String(transferOutcome.amount), 0)}
                <span
                  className={`ml-1 align-top text-lg font-bold ${
                    transferOutcome.kind === 'bank_error' ? 'text-[#64748b]' : 'text-[#58d6f1]'
                  }`}
                >
                  UZS
                </span>
              </p>
              <p className="mb-8 text-xs text-[#5c6b73]">
                {transferOutcome.kind === 'success' ? 'Комиссия 0 UZS' : 'Средства не списаны'}
              </p>

              {transferOutcome.kind === 'success' ? (
                <button
                  type="button"
                  title={
                    recipientAlreadyInFavorites
                      ? 'Нажмите, чтобы убрать из избранного'
                      : 'Добавить получателя в избранное'
                  }
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const m = transferOutcome.method
                    const payload = {
                      name: transferOutcome.recipientName,
                      method: m,
                      cardDigits: m === 'card' ? cardDigits : undefined,
                      phoneDigits: m === 'phone' ? phoneDigits : undefined,
                    }
                    if (recipientAlreadyInFavorites) {
                      removeFavoriteRecipientByIdentifier({
                        method: m,
                        cardDigits: m === 'card' ? cardDigits : undefined,
                        phoneDigits: m === 'phone' ? phoneDigits : undefined,
                      })
                    } else {
                      addFavoriteRecipient(payload)
                    }
                    onAddToFavorites?.(payload)
                    setFavoritesRevision((n) => n + 1)
                  }}
                  className={`mb-4 flex w-full items-center justify-center rounded-xl border border-[#1c2a41] px-4 py-3 text-center text-sm font-semibold transition-colors ${
                    recipientAlreadyInFavorites
                      ? 'cursor-pointer bg-[#112036] text-[#869398] hover:bg-[#1c2a41] hover:text-[#bcc9ce]'
                      : 'cursor-pointer bg-[#0d1c32] text-[#4cd6fb] hover:bg-[#112036]'
                  }`}
                >
                  <span className="flex items-center justify-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#112036]">
                      <span
                        className="material-symbols-outlined text-[20px] text-[#4cd6fb]"
                        style={
                          recipientAlreadyInFavorites
                            ? { fontVariationSettings: "'FILL' 1, 'wght' 600" }
                            : { fontVariationSettings: "'FILL' 0, 'wght' 500" }
                        }
                      >
                        star
                      </span>
                    </span>
                    {recipientAlreadyInFavorites ? 'В избранном' : 'Добавить получателя'}
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleDone}
                className="mt-auto w-full rounded-2xl bg-[#4cd6fb] py-3.5 text-sm font-bold text-[#071021] transition-all hover:bg-[#6ee0fc] active:scale-[0.98]"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
