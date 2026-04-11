import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatGroupedAmountInput, parseGroupedAmountString } from '../utils/amountInputFormat'
import CardSourceSelect from './CardSourceSelect'

function formatNum(n, ccy = 'UZS') {
  return Number(n).toLocaleString('ru-RU', {
    minimumFractionDigits: ccy === 'UZS' ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function formatAccountNumber(value) {
  const d = String(value ?? '').replace(/\D/g, '')
  return d.replace(/(.{4})/g, '$1 ').trim() || '—'
}

export default function AccountDetailSheet({ account, allUserCards, rates, onClose, onTopUp, onWithdraw }) {
  const [isClosing, setIsClosing] = useState(false)
  const [action, setAction] = useState(null)
  const [rawAmount, setRawAmount] = useState('')
  const [selectedCardId, setSelectedCardId] = useState('')

  useEffect(() => {
    if (account) {
      setIsClosing(false)
      setAction(null)
      setRawAmount('')
      setSelectedCardId(account.cardId ?? allUserCards[0]?.id ?? '')
    }
  }, [account, allUserCards])

  const requestClose = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onClose(); return }
    setIsClosing(true)
  }, [onClose])

  const handleAnimEnd = (e) => {
    if (e.target !== e.currentTarget || !isClosing) return
    onClose()
  }

  useEffect(() => {
    if (!account) return
    const h = (e) => { if (e.key === 'Escape') requestClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [account, requestClose])

  useEffect(() => {
    if (!account) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [account])

  const selectedCard = useMemo(
    () => allUserCards.find((c) => c.id === selectedCardId) ?? allUserCards[0],
    [allUserCards, selectedCardId],
  )

  const parsedAmount = parseGroupedAmountString(rawAmount)
  const ccy = account?.currency ?? 'UZS'

  const amountInCardCurrency = useMemo(() => {
    if (!selectedCard || !rates) return parsedAmount
    const cardCcy = selectedCard.foreignCurrency
    if (!cardCcy && ccy === 'UZS') return parsedAmount
    if (cardCcy && ccy === cardCcy) return parsedAmount
    const uzsPerAccCcy = ccy === 'UZS' ? 1 : (rates[ccy]?.rate ?? 1)
    const amountUzs = parsedAmount * uzsPerAccCcy
    if (!cardCcy) return amountUzs
    const uzsPerCard = rates[cardCcy]?.rate ?? 1
    return amountUzs / uzsPerCard
  }, [parsedAmount, ccy, selectedCard, rates])

  const cardBalance = selectedCard?.foreignCurrency
    ? (selectedCard.balanceForeign ?? 0)
    : (selectedCard?.balanceUzs ?? 0)

  if (!account) return null

  const canTopUp = parsedAmount > 0 && amountInCardCurrency <= cardBalance
  const canWithdrawAmount = parsedAmount > 0 && parsedAmount <= account.amount

  const handleAction = () => {
    if (!selectedCard) return
    if (action === 'topup' && canTopUp) {
      onTopUp(account, parsedAmount, selectedCard, amountInCardCurrency)
      setAction(null)
      setRawAmount('')
    }
    if (action === 'withdraw' && canWithdrawAmount) {
      onWithdraw(account, parsedAmount, selectedCard, amountInCardCurrency)
      setAction(null)
      setRawAmount('')
    }
  }

  const sortedHistory = [...account.history].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="fixed inset-0 z-[130] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'}`}
        onClick={requestClose}
        type="button"
      />
      <div
        className={`relative z-10 flex h-[min(90dvh,740px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:max-w-lg sm:rounded-3xl ${isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'}`}
        onAnimationEnd={handleAnimEnd}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2 className="font-headline min-w-0 flex-1 truncate pr-2 text-lg font-bold text-[#d6e3ff]">
            {account.label?.trim() ? account.label : `Счёт (${ccy})`}
          </h2>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4 space-y-5">
          <div className="rounded-2xl border border-[#4cd6fb]/15 bg-[#112036] p-5 text-center">
            <p className="mb-1 text-xs uppercase tracking-wider text-[#5c6b73]">Баланс счёта</p>
            <p className="text-3xl font-extrabold text-[#d6e3ff]">{formatNum(account.amount, ccy)} {ccy}</p>
            <p className="mt-2 text-xs text-[#5c6b73]">
              Открыт {new Date(account.openedAt).toLocaleDateString('ru-RU')}
            </p>
            <p className="mt-3 font-mono text-xs tracking-wider text-[#bcc9ce]">
              № {formatAccountNumber(account.accountNumber)}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                action === 'topup'
                  ? 'bg-[#003642] text-[#4cd6fb]'
                  : 'border border-[#1c2a41] bg-[#112036] text-[#bcc9ce] hover:border-[#4cd6fb]/40'
              }`}
              onClick={() => { setAction(action === 'topup' ? null : 'topup'); setRawAmount('') }}
              type="button"
            >
              Пополнить
            </button>
            <button
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                action === 'withdraw'
                  ? 'bg-[#003642] text-[#4cd6fb]'
                  : 'border border-[#1c2a41] bg-[#112036] text-[#bcc9ce] hover:border-[#4cd6fb]/40'
              }`}
              onClick={() => { setAction(action === 'withdraw' ? null : 'withdraw'); setRawAmount('') }}
              type="button"
            >
              Снять
            </button>
          </div>

          {action ? (
            <div className="space-y-3 rounded-2xl border border-[#4cd6fb]/20 bg-[#0d1c32] p-4">
              <CardSourceSelect
                label={action === 'topup' ? 'Списать с карты' : 'Зачислить на карту'}
                labelClassName="mb-1 text-xs text-[#5c6b73]"
                cards={allUserCards}
                value={selectedCardId}
                onChange={setSelectedCardId}
              />
              <div>
                <p className="mb-1 text-xs text-[#5c6b73]">
                  Сумма ({ccy}){action === 'withdraw' ? ` · макс. ${formatNum(account.amount, ccy)}` : ''}
                </p>
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-lg font-bold text-[#d6e3ff] outline-none focus:border-[#4cd6fb]/50"
                  placeholder="0"
                  value={rawAmount}
                  onChange={(e) => setRawAmount(formatGroupedAmountInput(e.target.value))}
                />
                {action === 'topup' && selectedCard ? (
                  <p className="mt-1 text-[11px] text-[#5c6b73]">
                    Доступно: {formatNum(cardBalance)} {selectedCard.foreignCurrency ?? 'UZS'}
                    {ccy !== (selectedCard.foreignCurrency ?? 'UZS') && parsedAmount > 0 ? (
                      <span className="ml-2 text-[#4cd6fb]">≈ {formatNum(amountInCardCurrency)} {selectedCard.foreignCurrency ?? 'UZS'}</span>
                    ) : null}
                  </p>
                ) : null}
              </div>
              {action === 'topup' && parsedAmount > 0 && amountInCardCurrency > cardBalance ? (
                <p className="text-xs font-medium text-[#ffb4ab]">Недостаточно средств</p>
              ) : null}
              {action === 'withdraw' && parsedAmount > account.amount ? (
                <p className="text-xs font-medium text-[#ffb4ab]">Сумма превышает баланс счёта</p>
              ) : null}
              <button
                className="w-full rounded-xl bg-[#003642] py-3 text-sm font-bold text-[#4cd6fb] transition-opacity disabled:opacity-40"
                disabled={action === 'topup' ? !canTopUp : !canWithdrawAmount}
                onClick={handleAction}
                type="button"
              >
                {action === 'topup' ? 'Пополнить' : 'Снять'}
              </button>
            </div>
          ) : null}

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#4cd6fb]/80">История</h3>
            {sortedHistory.length === 0 ? (
              <p className="text-sm text-[#5c6b73]">Пока нет операций</p>
            ) : (
              <ul className="space-y-2">
                {sortedHistory.map((h, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl bg-[#112036] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#d6e3ff]">
                        {h.type === 'open' ? 'Открытие счёта' : h.type === 'topup' ? 'Пополнение' : 'Снятие'}
                      </p>
                      <p className="text-[11px] text-[#5c6b73]">
                        {new Date(h.date).toLocaleDateString('ru-RU')},{' '}
                        {new Date(h.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className={`font-bold tabular-nums ${h.type === 'withdraw' ? 'text-[#ffb4ab]' : 'text-[#58d6f1]'}`}>
                      {h.type === 'withdraw' ? '-' : '+'}{formatNum(h.amount, ccy)} {ccy}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
