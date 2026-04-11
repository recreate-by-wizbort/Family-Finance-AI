import { useCallback, useEffect, useMemo, useState } from 'react'
import UzsAmount from './UzsAmount'
import { formatDepositCurrency, getAccruedInterest } from '../utils/deposits'
import { formatGroupedAmountInput, parseGroupedAmountString } from '../utils/amountInputFormat'
import CardSourceSelect from './CardSourceSelect'

function formatNum(n) {
  return Number(n).toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function DepositDetailSheet({
  deposit,
  allUserCards,
  rates,
  onClose,
  onTopUp,
  onWithdraw,
}) {
  const [mode, setMode] = useState(null)
  const [selectedCardId, setSelectedCardId] = useState(allUserCards[0]?.id ?? '')
  const [amountStr, setAmountStr] = useState('')
  const [error, setError] = useState('')
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    setMode(null)
    setAmountStr('')
    setError('')
    setIsClosing(false)
    setSelectedCardId(allUserCards[0]?.id ?? '')
  }, [deposit?.id, allUserCards])

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
    if (!deposit) return
    const h = (e) => {
      if (e.key === 'Escape') {
        if (mode) {
          setMode(null)
          return
        }
        requestClose()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [deposit, mode, requestClose])

  useEffect(() => {
    if (!deposit) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [deposit])

  const selectedCard = useMemo(
    () => allUserCards.find((c) => c.id === selectedCardId) ?? allUserCards[0],
    [allUserCards, selectedCardId],
  )

  const cardCurrency = selectedCard?.foreignCurrency ?? 'UZS'

  const amountDecimals = useMemo(() => {
    if (!mode || !deposit) return 0
    const cur = mode === 'topup' ? cardCurrency : deposit.currency
    return cur === 'UZS' ? 0 : 2
  }, [mode, deposit, cardCurrency])

  const amountParsed = useMemo(
    () => parseGroupedAmountString(amountStr),
    [amountStr],
  )

  const needConversion = useMemo(() => {
    if (!selectedCard || !deposit) return false
    return cardCurrency !== deposit.currency
  }, [selectedCard, deposit, cardCurrency])

  const conversionRate = useMemo(() => {
    if (!needConversion || !rates || amountParsed <= 0) return null
    const rateUsdUzs = rates.USD?.rate ?? 12198
    const rateEurUzs = rates.EUR?.rate ?? 13220

    const toUzs = (cur, amt) => {
      if (cur === 'UZS') return amt
      if (cur === 'USD') return amt * rateUsdUzs
      if (cur === 'EUR') return amt * rateEurUzs
      return amt
    }
    const fromUzs = (cur, uzsAmt) => {
      if (cur === 'UZS') return uzsAmt
      if (cur === 'USD') return uzsAmt / rateUsdUzs
      if (cur === 'EUR') return uzsAmt / rateEurUzs
      return uzsAmt
    }

    let convertedAmount
    if (mode === 'topup') {
      const amountInUzs = toUzs(cardCurrency, amountParsed)
      convertedAmount = fromUzs(deposit.currency, amountInUzs)
    } else {
      const amountInUzs = toUzs(deposit.currency, amountParsed)
      convertedAmount = fromUzs(cardCurrency, amountInUzs)
    }

    const rateLine = (() => {
      if (cardCurrency === 'UZS') {
        if (deposit.currency === 'USD') return `1 USD = ${formatNum(rateUsdUzs)} UZS`
        if (deposit.currency === 'EUR') return `1 EUR = ${formatNum(rateEurUzs)} UZS`
      }
      if (deposit.currency === 'UZS') {
        if (cardCurrency === 'USD') return `1 USD = ${formatNum(rateUsdUzs)} UZS`
        if (cardCurrency === 'EUR') return `1 EUR = ${formatNum(rateEurUzs)} UZS`
      }
      if (cardCurrency === 'USD' && deposit.currency === 'EUR') {
        return `1 USD = ${formatNum(rateUsdUzs / rateEurUzs)} EUR`
      }
      if (cardCurrency === 'EUR' && deposit.currency === 'USD') {
        return `1 EUR = ${formatNum(rateEurUzs / rateUsdUzs)} USD`
      }
      return null
    })()

    return { convertedAmount, rateLine }
  }, [needConversion, rates, cardCurrency, deposit, amountParsed, mode])

  const handleSubmit = () => {
    setError('')
    if (!selectedCard || !deposit) return
    if (amountParsed <= 0) {
      setError('Введите сумму')
      return
    }

    if (mode === 'topup') {
      const cardBalance = selectedCard.foreignCurrency
        ? selectedCard.balanceForeign ?? 0
        : selectedCard.balanceUzs ?? 0
      if (amountParsed > cardBalance) {
        setError('Недостаточно средств на карте')
        return
      }
      const depositAmount = needConversion
        ? Math.round((conversionRate?.convertedAmount ?? 0) * 100) / 100
        : amountParsed
      if (depositAmount <= 0) {
        setError('Сумма слишком мала')
        return
      }
      onTopUp(deposit, depositAmount, selectedCard, amountParsed)
    } else {
      if (amountParsed > deposit.amount) {
        setError('Сумма превышает остаток на вкладе')
        return
      }
      const cardAmount = needConversion
        ? Math.round((conversionRate?.convertedAmount ?? 0) * 100) / 100
        : amountParsed
      onWithdraw(deposit, amountParsed, selectedCard, cardAmount)
    }
    setMode(null)
    setAmountStr('')
  }

  if (!deposit) return null

  const accrued = getAccruedInterest(deposit)
  const inputCurrency = mode === 'topup' ? cardCurrency : deposit.currency

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
        className={`relative z-10 flex h-[min(88dvh,780px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:h-[min(88dvh,800px)] sm:max-w-lg sm:rounded-3xl ${
          isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'
        }`}
        onAnimationEnd={handlePanelAnimEnd}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2 className="font-headline text-lg font-bold text-[#d6e3ff]">
            Вклад · {deposit.currency}
          </h2>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4">
          {/* Сумма */}
          <div className="mb-5 rounded-2xl border border-[#1c2a41] bg-[#112036] p-4">
            <p className="text-xs text-[#5c6b73]">Остаток на вкладе</p>
            <p className="mt-1 text-2xl font-extrabold text-[#d6e3ff]">
              {deposit.currency === 'UZS' ? (
                <UzsAmount as="span" value={formatNum(deposit.amount)} />
              ) : (
                formatDepositCurrency(deposit.amount, deposit.currency)
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <div>
                <span className="text-[#5c6b73]">Ставка: </span>
                <span className="font-bold text-[#4cd6fb]">{deposit.rate}%</span>
              </div>
              <div>
                <span className="text-[#5c6b73]">Начислено: </span>
                <span className="font-semibold text-[#58d6f1]">
                  +{formatDepositCurrency(accrued, deposit.currency)}
                </span>
              </div>
              <div>
                <span className="text-[#5c6b73]">Тип: </span>
                <span className="text-[#d6e3ff]">
                  {deposit.withdrawable ? 'С пополнением и снятием' : 'Без снятия'}
                </span>
              </div>
            </div>
          </div>

          {/* Даты */}
          <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-[#1c2a41] bg-[#112036] p-3">
              <p className="text-xs text-[#5c6b73]">Открыт</p>
              <p className="mt-0.5 font-semibold text-[#d6e3ff]">
                {formatDate(deposit.openedAt)}
              </p>
            </div>
            <div className="rounded-xl border border-[#1c2a41] bg-[#112036] p-3">
              <p className="text-xs text-[#5c6b73]">Закрытие</p>
              <p className="mt-0.5 font-semibold text-[#d6e3ff]">
                {formatDate(deposit.maturityDate)}
              </p>
            </div>
          </div>

          {/* Кнопки действий */}
          {deposit.withdrawable ? (
            <div className="mb-5 flex gap-3">
              <button
                className={`flex-1 rounded-xl border py-3 text-center text-sm font-bold transition-colors ${
                  mode === 'topup'
                    ? 'border-[#4cd6fb] bg-[#003642] text-[#4cd6fb]'
                    : 'border-[#1c2a41] bg-[#112036] text-[#d6e3ff] hover:border-[#4cd6fb]/40'
                }`}
                onClick={() => {
                  setMode(mode === 'topup' ? null : 'topup')
                  setAmountStr('')
                  setError('')
                }}
                type="button"
              >
                <span className="material-symbols-outlined mr-1 text-[18px] align-middle">add</span>
                Пополнить
              </button>
              <button
                className={`flex-1 rounded-xl border py-3 text-center text-sm font-bold transition-colors ${
                  mode === 'withdraw'
                    ? 'border-[#ffb4ab] bg-[#3b121c]/60 text-[#ffb4ab]'
                    : 'border-[#1c2a41] bg-[#112036] text-[#d6e3ff] hover:border-[#ffb4ab]/40'
                }`}
                onClick={() => {
                  setMode(mode === 'withdraw' ? null : 'withdraw')
                  setAmountStr('')
                  setError('')
                }}
                type="button"
              >
                <span className="material-symbols-outlined mr-1 text-[18px] align-middle">
                  remove
                </span>
                Снять
              </button>
            </div>
          ) : (
            <div className="mb-5 flex gap-3">
              <button
                className={`flex-1 rounded-xl border py-3 text-center text-sm font-bold transition-colors ${
                  mode === 'topup'
                    ? 'border-[#4cd6fb] bg-[#003642] text-[#4cd6fb]'
                    : 'border-[#1c2a41] bg-[#112036] text-[#d6e3ff] hover:border-[#4cd6fb]/40'
                }`}
                onClick={() => {
                  setMode(mode === 'topup' ? null : 'topup')
                  setAmountStr('')
                  setError('')
                }}
                type="button"
              >
                <span className="material-symbols-outlined mr-1 text-[18px] align-middle">add</span>
                Пополнить
              </button>
              <div className="flex flex-1 items-center justify-center rounded-xl border border-[#1c2a41] bg-[#112036]/50 py-3 text-sm text-[#5c6b73]">
                <span className="material-symbols-outlined mr-1 text-[18px]">lock</span>
                Снятие недоступно
              </div>
            </div>
          )}

          {/* Форма пополнения / снятия */}
          {mode ? (
            <div className="mb-5 rounded-2xl border border-[#4cd6fb]/20 bg-[#0d1c32] p-4">
              <p className="mb-3 text-sm font-bold text-[#d6e3ff]">
                {mode === 'topup' ? 'Пополнение вклада' : 'Снятие со вклада'}
              </p>

              <CardSourceSelect
                className="mb-3"
                label="Карта"
                labelClassName="mb-1 text-xs text-[#5c6b73]"
                cards={allUserCards}
                value={selectedCardId}
                onChange={setSelectedCardId}
              />

              <p className="mb-1 text-xs text-[#5c6b73]">
                Сумма ({inputCurrency})
              </p>
              <input
                className="mb-2 w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-2.5 text-lg font-bold tabular-nums text-[#d6e3ff] outline-none placeholder:text-[#5c6b73] focus:border-[#4cd6fb]/50"
                inputMode="decimal"
                placeholder={
                  mode === 'withdraw'
                    ? `Макс. ${formatNum(deposit.amount)} ${deposit.currency}`
                    : '0'
                }
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(formatGroupedAmountInput(e.target.value, amountDecimals))
                  setError('')
                }}
              />

              {needConversion && amountParsed > 0 && conversionRate ? (
                <div className="mb-2 rounded-lg border border-[#4cd6fb]/15 bg-[#071021] p-2.5 text-xs">
                  {conversionRate.rateLine ? (
                    <p className="text-[#5c6b73]">
                      Курс:{' '}
                      <span className="font-semibold text-[#d6e3ff]">
                        {conversionRate.rateLine}
                      </span>
                    </p>
                  ) : null}
                  <p className="mt-1 font-semibold text-[#58d6f1]">
                    {mode === 'topup'
                      ? `На вклад: ${formatDepositCurrency(
                          Math.round((conversionRate.convertedAmount ?? 0) * 100) / 100,
                          deposit.currency,
                        )}`
                      : `На карту: ${formatDepositCurrency(
                          Math.round((conversionRate.convertedAmount ?? 0) * 100) / 100,
                          cardCurrency,
                        )}`}
                  </p>
                </div>
              ) : null}

              {error ? (
                <p className="mb-2 text-sm text-[#ffb4ab]">{error}</p>
              ) : null}

              <button
                className={`mt-1 w-full rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40 ${
                  mode === 'topup'
                    ? 'bg-[#4cd6fb] text-[#003642]'
                    : 'bg-[#ffb4ab] text-[#3b121c]'
                }`}
                disabled={amountParsed <= 0}
                onClick={handleSubmit}
                type="button"
              >
                {mode === 'topup' ? 'Пополнить' : 'Снять'}
              </button>
            </div>
          ) : null}

          {/* История */}
          {deposit.history.length > 0 ? (
            <>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
                История операций
              </p>
              <ul className="space-y-2">
                {[...deposit.history].reverse().map((h, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-[#d6e3ff]">
                        {h.type === 'open'
                          ? 'Открытие'
                          : h.type === 'topup'
                            ? 'Пополнение'
                            : 'Снятие'}
                      </p>
                      <p className="text-[10px] text-[#5c6b73]">{formatDateTime(h.date)}</p>
                    </div>
                    <p
                      className={`font-bold tabular-nums ${
                        h.type === 'withdraw' ? 'text-[#ffb4ab]' : 'text-[#58d6f1]'
                      }`}
                    >
                      {h.type === 'withdraw' ? '−' : '+'}
                      {formatDepositCurrency(h.amount, deposit.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
