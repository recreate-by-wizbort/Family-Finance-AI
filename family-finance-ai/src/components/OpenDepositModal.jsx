import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEPOSIT_RATES,
  DEPOSIT_TERM_MONTHS,
  MIN_AMOUNTS,
  buildMonthlyDepositSchedule,
  createDeposit,
  formatDepositCurrency,
} from '../utils/deposits'
import { formatGroupedAmountInput, parseGroupedAmountString } from '../utils/amountInputFormat'
import CardSourceSelect from './CardSourceSelect'

const CURRENCIES = [
  { code: 'UZS', label: 'Сум', symbol: 'UZS' },
  { code: 'USD', label: 'Доллар', symbol: '$' },
  { code: 'EUR', label: 'Евро', symbol: '€' },
]

function formatNum(n) {
  return Number(n).toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export default function OpenDepositModal({
  isOpen,
  onClose,
  allUserCards,
  rates,
  onDepositCreated,
}) {
  const [currency, setCurrency] = useState('UZS')
  const [withdrawable, setWithdrawable] = useState(true)
  const [selectedCardId, setSelectedCardId] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [error, setError] = useState('')
  const [monthlyDetailOpen, setMonthlyDetailOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCurrency('UZS')
      setWithdrawable(true)
      setSelectedCardId(allUserCards[0]?.id ?? '')
      setAmountStr('')
      setError('')
      setIsClosing(false)
      setMonthlyDetailOpen(false)
    }
  }, [isOpen, allUserCards])

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

  const selectedCard = useMemo(
    () => allUserCards.find((c) => c.id === selectedCardId) ?? allUserCards[0],
    [allUserCards, selectedCardId],
  )

  const rateGroup = DEPOSIT_RATES[currency]
  const currentRate = withdrawable ? rateGroup.withdrawable : rateGroup.fixed
  const minAmount = MIN_AMOUNTS[currency]

  const cardCurrency = selectedCard?.foreignCurrency ?? 'UZS'

  const amountParsed = useMemo(
    () => parseGroupedAmountString(amountStr),
    [amountStr],
  )

  const amountDecimals = cardCurrency === 'UZS' ? 0 : 2

  const needConversion = useMemo(() => {
    if (!selectedCard) return false
    return cardCurrency !== currency
  }, [selectedCard, currency, cardCurrency])

  const conversionRate = useMemo(() => {
    if (!needConversion || !rates) return null
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

    const amountInUzs = toUzs(cardCurrency, amountParsed)
    const depositAmount = fromUzs(currency, amountInUzs)

    const rateLine = (() => {
      if (cardCurrency === 'UZS') {
        if (currency === 'USD') return `1 USD = ${formatNum(rateUsdUzs)} UZS`
        if (currency === 'EUR') return `1 EUR = ${formatNum(rateEurUzs)} UZS`
      }
      if (currency === 'UZS') {
        if (cardCurrency === 'USD') return `1 USD = ${formatNum(rateUsdUzs)} UZS`
        if (cardCurrency === 'EUR') return `1 EUR = ${formatNum(rateEurUzs)} UZS`
      }
      if (cardCurrency === 'USD' && currency === 'EUR') {
        const cross = rateUsdUzs / rateEurUzs
        return `1 USD = ${formatNum(cross)} EUR`
      }
      if (cardCurrency === 'EUR' && currency === 'USD') {
        const cross = rateEurUzs / rateUsdUzs
        return `1 EUR = ${formatNum(cross)} USD`
      }
      return null
    })()

    return { depositAmount, rateLine }
  }, [needConversion, rates, cardCurrency, currency, amountParsed])

  const depositAmountFinal = needConversion
    ? conversionRate?.depositAmount ?? 0
    : amountParsed

  const monthlySchedule = useMemo(() => {
    if (depositAmountFinal <= 0) return []
    return buildMonthlyDepositSchedule(
      Math.round(depositAmountFinal * 100) / 100,
      currentRate,
      DEPOSIT_TERM_MONTHS,
    )
  }, [depositAmountFinal, currentRate])

  const handleSubmit = () => {
    setError('')
    if (!selectedCard) {
      setError('Выберите карту')
      return
    }
    if (amountParsed <= 0) {
      setError('Введите сумму')
      return
    }

    const cardBalance = selectedCard.foreignCurrency
      ? selectedCard.balanceForeign ?? 0
      : selectedCard.balanceUzs ?? 0

    if (amountParsed > cardBalance) {
      setError('Недостаточно средств на карте')
      return
    }
    if (depositAmountFinal < minAmount) {
      setError(
        `Минимальная сумма вклада: ${formatDepositCurrency(minAmount, currency)}`,
      )
      return
    }

    const dep = createDeposit({
      currency,
      withdrawable,
      amount: Math.round(depositAmountFinal * 100) / 100,
      cardId: selectedCard.id,
    })

    onDepositCreated(dep, selectedCard, amountParsed)
    requestClose()
  }

  if (!isOpen) return null

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
          <h2 className="font-headline text-lg font-bold text-[#d6e3ff]">Открыть вклад</h2>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4">
          {/* Валюта */}
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
            Валюта вклада
          </p>
          <div className="mb-5 flex gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                className={`flex-1 rounded-xl border py-3 text-center text-sm font-bold transition-colors ${
                  currency === c.code
                    ? 'border-[#4cd6fb] bg-[#003642] text-[#4cd6fb]'
                    : 'border-[#1c2a41] bg-[#112036] text-[#bcc9ce] hover:border-[#4cd6fb]/40'
                }`}
                onClick={() => setCurrency(c.code)}
                type="button"
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Тип */}
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
            Тип вклада
          </p>
          <div className="mb-1 flex gap-2">
            <button
              className={`flex-1 rounded-xl border px-3 py-3 text-center text-sm font-bold transition-colors ${
                withdrawable
                  ? 'border-[#4cd6fb] bg-[#003642] text-[#4cd6fb]'
                  : 'border-[#1c2a41] bg-[#112036] text-[#bcc9ce] hover:border-[#4cd6fb]/40'
              }`}
              onClick={() => setWithdrawable(true)}
              type="button"
            >
              С пополнением и снятием
            </button>
            <button
              className={`flex-1 rounded-xl border px-3 py-3 text-center text-sm font-bold transition-colors ${
                !withdrawable
                  ? 'border-[#4cd6fb] bg-[#003642] text-[#4cd6fb]'
                  : 'border-[#1c2a41] bg-[#112036] text-[#bcc9ce] hover:border-[#4cd6fb]/40'
              }`}
              onClick={() => setWithdrawable(false)}
              type="button"
            >
              Без снятия
            </button>
          </div>
          <p className="mb-5 text-xs text-[#5c6b73]">
            {withdrawable
              ? `Можно пополнять и снимать средства в любое время. Ставка: ${currentRate}% годовых.`
              : `Средства нельзя снять до конца срока — более высокая ставка: ${currentRate}% годовых.`}
          </p>

          {/* Ставка и срок */}
          <div className="mb-5 flex gap-3">
            <div className="flex-1 rounded-xl border border-[#1c2a41] bg-[#112036] p-3 text-center">
              <p className="text-2xl font-extrabold text-[#4cd6fb]">{currentRate}%</p>
              <p className="text-xs text-[#5c6b73]">годовых</p>
            </div>
            <div className="flex-1 rounded-xl border border-[#1c2a41] bg-[#112036] p-3 text-center">
              <p className="text-2xl font-extrabold text-[#d6e3ff]">{DEPOSIT_TERM_MONTHS}</p>
              <p className="text-xs text-[#5c6b73]">месяцев</p>
            </div>
          </div>

          <CardSourceSelect
            cards={allUserCards}
            value={selectedCardId}
            onChange={setSelectedCardId}
          />

          {/* Сумма */}
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
            Сумма пополнения ({cardCurrency})
          </p>
          <input
            className="mb-1 w-full rounded-xl border border-[#1c2a41] bg-[#112036] px-4 py-3 text-lg font-bold tabular-nums text-[#d6e3ff] outline-none placeholder:text-[#5c6b73] focus:border-[#4cd6fb]/50"
            inputMode="decimal"
            placeholder={`Мин. ${formatNum(needConversion ? 0 : minAmount)} ${cardCurrency}`}
            value={amountStr}
            onChange={(e) => {
              setAmountStr(formatGroupedAmountInput(e.target.value, amountDecimals))
              setError('')
            }}
          />
          <p className="mb-3 text-xs text-[#5c6b73]">
            Минимальная сумма вклада: {formatDepositCurrency(minAmount, currency)}
          </p>

          {/* Конвертация */}
          {needConversion && amountParsed > 0 && conversionRate ? (
            <div className="mb-5 rounded-xl border border-[#4cd6fb]/20 bg-[#0d1c32] p-3">
              {conversionRate.rateLine ? (
                <p className="mb-1 text-xs text-[#5c6b73]">
                  Курс: <span className="font-semibold text-[#d6e3ff]">{conversionRate.rateLine}</span>
                </p>
              ) : null}
              <p className="text-sm font-semibold text-[#58d6f1]">
                На вклад поступит: {formatDepositCurrency(
                  Math.round(conversionRate.depositAmount * 100) / 100,
                  currency,
                )}
              </p>
            </div>
          ) : null}

          {error ? (
            <p className="mb-4 rounded-xl border border-[#ffb4ab]/30 bg-[#3b121c]/60 px-4 py-2.5 text-sm text-[#ffb4ab]">
              {error}
            </p>
          ) : null}

          {/* Предварительный расчёт */}
          {depositAmountFinal > 0 ? (
            <div className="mb-5 rounded-xl border border-[#1c2a41] bg-[#112036] p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]">
                Предварительный расчёт
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5c6b73]">Сумма вклада</span>
                  <span className="font-semibold text-[#d6e3ff]">
                    {formatDepositCurrency(Math.round(depositAmountFinal * 100) / 100, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5c6b73]">Доход за {DEPOSIT_TERM_MONTHS} мес.</span>
                  <span className="font-semibold text-[#58d6f1]">
                    +{formatDepositCurrency(
                      Math.round(
                        depositAmountFinal * (currentRate / 100) * (DEPOSIT_TERM_MONTHS / 12) * 100,
                      ) / 100,
                      currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#1c2a41] pt-1">
                  <span className="text-[#5c6b73]">Итого к концу срока</span>
                  <span className="font-bold text-[#d6e3ff]">
                    {formatDepositCurrency(
                      Math.round(
                        (depositAmountFinal +
                          depositAmountFinal *
                            (currentRate / 100) *
                            (DEPOSIT_TERM_MONTHS / 12)) *
                          100,
                      ) / 100,
                      currency,
                    )}
                  </span>
                </div>
              </div>

              <button
                className="mt-3 flex w-full items-center justify-center gap-1 py-1 text-xs font-medium text-[#4cd6fb]/90 transition-colors hover:text-[#4cd6fb]"
                onClick={() => setMonthlyDetailOpen((v) => !v)}
                type="button"
                aria-expanded={monthlyDetailOpen}
              >
                <span>Помесячный рост</span>
                <span
                  className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                    monthlyDetailOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>

              {monthlyDetailOpen ? (
                <div className="mt-2 max-h-[220px] overflow-y-auto rounded-lg border border-[#1c2a41] bg-[#0d1c32]">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-[#1c2a41] text-[#5c6b73]">
                        <th className="px-2 py-2 font-semibold">Мес.</th>
                        <th className="px-2 py-2 font-semibold">Начислено за месяц</th>
                        <th className="px-2 py-2 text-right font-semibold">Остаток</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlySchedule.map((row) => (
                        <tr
                          key={row.month}
                          className="border-b border-[#1c2a41]/80 last:border-0"
                        >
                          <td className="px-2 py-1.5 tabular-nums text-[#bcc9ce]">
                            {row.month}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums text-[#58d6f1]">
                            +{formatDepositCurrency(row.interestMonth, currency)}
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium tabular-nums text-[#d6e3ff]">
                            {formatDepositCurrency(row.balance, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            className="w-full rounded-2xl bg-[#4cd6fb] py-4 text-base font-bold text-[#003642] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            disabled={amountParsed <= 0}
            onClick={handleSubmit}
            type="button"
          >
            Открыть вклад
          </button>
        </div>
      </div>
    </div>
  )
}
