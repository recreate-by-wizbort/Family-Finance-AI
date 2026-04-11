const DEPOSITS_STORAGE_KEY = 'family-finance-deposits-v1'

export const DEPOSIT_TERM_MONTHS = 13

export const DEPOSIT_RATES = {
  UZS: { withdrawable: 18, fixed: 20 },
  USD: { withdrawable: 6, fixed: 7 },
  EUR: { withdrawable: 6, fixed: 7 },
}

export const MIN_AMOUNTS = {
  UZS: 100_000,
  USD: 10,
  EUR: 10,
}

export function loadDeposits() {
  try {
    const raw = localStorage.getItem(DEPOSITS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveDeposits(deposits) {
  localStorage.setItem(DEPOSITS_STORAGE_KEY, JSON.stringify(deposits))
}

export function createDeposit({ currency, withdrawable, amount, cardId }) {
  const rateGroup = DEPOSIT_RATES[currency] ?? DEPOSIT_RATES.UZS
  const rate = withdrawable ? rateGroup.withdrawable : rateGroup.fixed
  const now = new Date()
  const maturityDate = new Date(now)
  maturityDate.setMonth(maturityDate.getMonth() + DEPOSIT_TERM_MONTHS)

  return {
    id: `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    currency,
    withdrawable,
    rate,
    termMonths: DEPOSIT_TERM_MONTHS,
    amount,
    initialAmount: amount,
    openedAt: now.toISOString(),
    maturityDate: maturityDate.toISOString(),
    cardId,
    history: [
      {
        type: 'open',
        amount,
        date: now.toISOString(),
        cardId,
      },
    ],
  }
}

export function topUpDeposit(deposit, amount, cardId) {
  return {
    ...deposit,
    amount: deposit.amount + amount,
    history: [
      ...deposit.history,
      { type: 'topup', amount, date: new Date().toISOString(), cardId },
    ],
  }
}

export function withdrawFromDeposit(deposit, amount, cardId) {
  const newAmount = deposit.amount - amount
  if (newAmount < 0) return null
  return {
    ...deposit,
    amount: newAmount,
    history: [
      ...deposit.history,
      { type: 'withdraw', amount, date: new Date().toISOString(), cardId },
    ],
  }
}

export function getAccruedInterest(deposit) {
  const opened = new Date(deposit.openedAt)
  const now = new Date()
  const msElapsed = now - opened
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24)
  return Math.round(deposit.amount * (deposit.rate / 100) * (daysElapsed / 365) * 100) / 100
}

/** Простой процент: доход равномерно по месяцам (как в предварительном расчёте). */
export function buildMonthlyDepositSchedule(principal, annualRatePercent, termMonths) {
  const p = Number(principal)
  const r = Number(annualRatePercent)
  const n = Math.max(1, Math.floor(termMonths))
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(r)) return []
  const totalInterest = p * (r / 100) * (n / 12)
  const monthlyInterest = totalInterest / n
  const rows = []
  let cum = 0
  for (let m = 1; m <= n; m++) {
    cum += monthlyInterest
    rows.push({
      month: m,
      interestMonth: Math.round(monthlyInterest * 100) / 100,
      interestTotal: Math.round(cum * 100) / 100,
      balance: Math.round((p + cum) * 100) / 100,
    })
  }
  return rows
}

/** Два демо-вклада для просмотра списка (?seedDeposits=1 при пустом хранилище). */
export function createBuiltInDemoDeposits() {
  const now = new Date()
  const m = (d, months) => {
    const x = new Date(d)
    x.setMonth(x.getMonth() + months)
    return x.toISOString()
  }
  const opened1 = new Date(now)
  opened1.setMonth(opened1.getMonth() - 2)
  const opened2 = new Date(now)
  opened2.setMonth(opened2.getMonth() - 5)

  return [
    {
      id: 'dep_demo_uzs',
      currency: 'UZS',
      withdrawable: true,
      rate: 18,
      termMonths: DEPOSIT_TERM_MONTHS,
      amount: 125_000,
      initialAmount: 125_000,
      openedAt: opened1.toISOString(),
      maturityDate: m(opened1, DEPOSIT_TERM_MONTHS),
      cardId: 'demo',
      history: [
        {
          type: 'open',
          amount: 125_000,
          date: opened1.toISOString(),
          cardId: 'demo',
        },
      ],
    },
    {
      id: 'dep_demo_usd',
      currency: 'USD',
      withdrawable: false,
      rate: 7,
      termMonths: DEPOSIT_TERM_MONTHS,
      amount: 42.5,
      initialAmount: 40,
      openedAt: opened2.toISOString(),
      maturityDate: m(opened2, DEPOSIT_TERM_MONTHS),
      cardId: 'demo',
      history: [
        {
          type: 'open',
          amount: 40,
          date: opened2.toISOString(),
          cardId: 'demo',
        },
        {
          type: 'topup',
          amount: 2.5,
          date: new Date(opened2.getTime() + 86400000 * 14).toISOString(),
          cardId: 'demo',
        },
      ],
    },
  ]
}

export function formatDepositCurrency(amount, currency) {
  if (currency === 'UZS') {
    return (
      Number(amount)
        .toLocaleString('ru-RU', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
        .replace(/,/g, ' ') + ' UZS'
    )
  }
  return (
    Number(amount).toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    ' ' +
    currency
  )
}
