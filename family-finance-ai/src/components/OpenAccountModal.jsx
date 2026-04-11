import { useCallback, useEffect, useMemo, useState } from 'react'
import { createAccount } from '../utils/accounts'
import { formatGroupedAmountInput, parseGroupedAmountString } from '../utils/amountInputFormat'
import CardSourceSelect from './CardSourceSelect'

const CURRENCIES = [
  { code: 'UZS', label: 'Сум', symbol: 'UZS' },
  { code: 'USD', label: 'Доллар', symbol: '$' },
  { code: 'EUR', label: 'Евро', symbol: '€' },
]

function formatNum(n) {
  return Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function OpenAccountModal({ isOpen, onClose, allUserCards, rates, onAccountCreated }) {
  const [currency, setCurrency] = useState('UZS')
  const [accountName, setAccountName] = useState('')
  const [rawAmount, setRawAmount] = useState('')
  const [selectedCardId, setSelectedCardId] = useState('')
  const [isClosing, setIsClosing] = useState(false)

  const amountDecimals = currency === 'UZS' ? 0 : 2

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      setCurrency('UZS')
      setAccountName('')
      setRawAmount('')
      setSelectedCardId(allUserCards[0]?.id ?? '')
    }
  }, [isOpen, allUserCards])

  const requestClose = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onClose(); return }
    setIsClosing(true)
  }, [onClose])

  const handleAnimEnd = (e) => {
    if (e.target !== e.currentTarget || !isClosing) return
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const h = (e) => { if (e.key === 'Escape') requestClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, requestClose])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  const selectedCard = useMemo(
    () => allUserCards.find((c) => c.id === selectedCardId) ?? allUserCards[0],
    [allUserCards, selectedCardId],
  )

  const parsedAmount = parseGroupedAmountString(rawAmount)

  const amountInCardCurrency = useMemo(() => {
    if (!selectedCard || !rates) return parsedAmount
    const cardCcy = selectedCard.foreignCurrency
    if (!cardCcy && currency === 'UZS') return parsedAmount
    if (cardCcy && currency === cardCcy) return parsedAmount
    const uzsPerAccCcy = currency === 'UZS' ? 1 : (rates[currency]?.rate ?? 1)
    const amountUzs = parsedAmount * uzsPerAccCcy
    if (!cardCcy) return amountUzs
    const uzsPerCard = rates[cardCcy]?.rate ?? 1
    return amountUzs / uzsPerCard
  }, [parsedAmount, currency, selectedCard, rates])

  const cardBalance = selectedCard?.foreignCurrency
    ? (selectedCard.balanceForeign ?? 0)
    : (selectedCard?.balanceUzs ?? 0)

  const nameOk = accountName.trim().length > 0
  const canSubmit = nameOk && parsedAmount > 0 && amountInCardCurrency <= cardBalance

  const handleSubmit = () => {
    if (!canSubmit || !selectedCard) return
    const acc = createAccount({
      label: accountName.trim(),
      currency,
      amount: parsedAmount,
      cardId: selectedCard.id,
    })
    onAccountCreated(acc, selectedCard, amountInCardCurrency)
    requestClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[125] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'}`}
        onClick={requestClose}
        type="button"
      />
      <div
        className={`relative z-10 flex h-[min(90dvh,720px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:max-w-lg sm:rounded-3xl ${isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'}`}
        onAnimationEnd={handleAnimEnd}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2 className="font-headline text-lg font-bold text-[#d6e3ff]">Открыть счёт</h2>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4 space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#4cd6fb]/80">Валюта счёта</p>
            <div className="flex gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCurrency(c.code)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                    currency === c.code
                      ? 'bg-[#003642] text-[#4cd6fb]'
                      : 'border border-[#1c2a41] bg-[#112036] text-[#bcc9ce] hover:border-[#4cd6fb]/40'
                  }`}
                >
                  {c.label} ({c.symbol})
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#4cd6fb]/80">Название счёта</p>
            <input
              type="text"
              className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-sm font-semibold text-[#d6e3ff] outline-none placeholder:text-[#5c6b73] focus:border-[#4cd6fb]/50"
              placeholder="Например, Накопительный"
              maxLength={48}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>

          <CardSourceSelect
            className="mb-0"
            label="Списать с карты"
            labelClassName="mb-1 text-xs text-[#5c6b73]"
            cards={allUserCards}
            value={selectedCardId}
            onChange={setSelectedCardId}
          />

          <div>
            <p className="mb-1 text-xs text-[#5c6b73]">Сумма начального пополнения ({currency})</p>
            <input
              type="text"
              inputMode="decimal"
              className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-lg font-bold text-[#d6e3ff] outline-none focus:border-[#4cd6fb]/50"
              placeholder="0"
              value={rawAmount}
              onChange={(e) => setRawAmount(formatGroupedAmountInput(e.target.value, amountDecimals))}
            />
            {selectedCard ? (
              <p className="mt-1 text-[11px] text-[#5c6b73]">
                Доступно: {formatNum(cardBalance)} {selectedCard.foreignCurrency ?? 'UZS'}
                {currency !== (selectedCard.foreignCurrency ?? 'UZS') && parsedAmount > 0 ? (
                  <span className="ml-2 text-[#4cd6fb]">
                    ≈ {formatNum(amountInCardCurrency)} {selectedCard.foreignCurrency ?? 'UZS'}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          {parsedAmount > 0 && amountInCardCurrency > cardBalance ? (
            <p className="text-xs font-medium text-[#ffb4ab]">Недостаточно средств на карте</p>
          ) : null}

          <button
            className="w-full rounded-xl bg-[#003642] py-3.5 text-sm font-bold text-[#4cd6fb] transition-opacity disabled:opacity-40"
            disabled={!canSubmit}
            onClick={handleSubmit}
            type="button"
          >
            Открыть счёт
          </button>
        </div>
      </div>
    </div>
  )
}
