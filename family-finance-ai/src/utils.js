import {
  ACCOUNTS,
  CATEGORIES,
  FAMILY_MEMBERS,
  FILTER_PERIODS,
  GOALS,
  LAST_MONTH_STATS,
  LINKED_EXTERNAL_CARDS,
  MCC_CATEGORY_RULES,
  NON_EXPENSE_KINDS,
  TRANSACTIONS,
  resolveCategoryByMcc,
} from './mockData.js'

function toDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

function toEndOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function isInRange(date, fromDate, toDate) {
  if (!date) {
    return false
  }

  return date >= fromDate && date <= toDate
}

function normalizeExpenseTransaction(transaction) {
  return {
    ...transaction,
    category: resolveCategoryByMcc(transaction.mcc, transaction.category ?? 'other'),
  }
}

export function resolvePeriodRange(period = '30d', options = {}) {
  const nowDate = toDate(options.now) ?? new Date()
  const fromCustom = toDate(options.from)
  const toCustom = toDate(options.to)

  const toDateValue = toEndOfDay(toCustom ?? nowDate)
  const fromDateValue = new Date(toDateValue)

  switch (period) {
    case '7d':
      fromDateValue.setDate(toDateValue.getDate() - 6)
      break
    case '30d':
      fromDateValue.setDate(toDateValue.getDate() - 29)
      break
    case '90d':
      fromDateValue.setDate(toDateValue.getDate() - 89)
      break
    case '180d':
      fromDateValue.setDate(toDateValue.getDate() - 179)
      break
    case '365d':
      fromDateValue.setDate(toDateValue.getDate() - 364)
      break
    case 'mtd':
      fromDateValue.setFullYear(toDateValue.getFullYear(), toDateValue.getMonth(), 1)
      break
    case 'ytd':
      fromDateValue.setFullYear(toDateValue.getFullYear(), 0, 1)
      break
    case 'custom': {
      if (fromCustom && toCustom) {
        return {
          fromDate: toStartOfDay(fromCustom),
          toDate: toEndOfDay(toCustom),
        }
      }

      fromDateValue.setDate(toDateValue.getDate() - 29)
      break
    }
    default:
      fromDateValue.setDate(toDateValue.getDate() - 29)
      break
  }

  return {
    fromDate: toStartOfDay(fromDateValue),
    toDate: toDateValue,
  }
}

export function getTransactionsByPeriod(period = '30d', transactions = TRANSACTIONS, options = {}) {
  const { fromDate, toDate } = resolvePeriodRange(period, options)

  return transactions.filter((transaction) => {
    const txDate = toDate(transaction.timestamp)
    return isInRange(txDate, fromDate, toDate)
  })
}

export function getMonthTransactions(transactions = TRANSACTIONS, referenceDate = new Date()) {
  const date = toDate(referenceDate) ?? new Date()
  const month = date.getMonth()
  const year = date.getFullYear()

  return transactions.filter((transaction) => {
    const txDate = toDate(transaction.timestamp)
    return txDate && txDate.getFullYear() === year && txDate.getMonth() === month
  })
}

// 1. SMART TRANSFER FILTERING
export function getRealExpenses(transactions = TRANSACTIONS) {
  return transactions
    .filter(
      (transaction) =>
        transaction.direction === 'out' &&
        (transaction.kind === 'purchase' || transaction.kind === 'subscription')
    )
    .map(normalizeExpenseTransaction)
}

export function getFamilyTransfers(transactions = TRANSACTIONS) {
  return transactions.filter(
    (transaction) => transaction.kind === 'transfer_family' && transaction.direction === 'out'
  )
}

export function getInternalTransfers(transactions = TRANSACTIONS) {
  return transactions.filter(
    (transaction) => transaction.kind === 'transfer_internal' && transaction.direction === 'out'
  )
}

// 2. ANALYTICS BY CATEGORY/MEMBER
export function getExpensesByCategory(transactions = TRANSACTIONS) {
  return getRealExpenses(transactions).reduce((accumulator, transaction) => {
    const category = transaction.category || 'other'
    accumulator[category] = (accumulator[category] || 0) + Math.abs(transaction.amountUzs)
    return accumulator
  }, {})
}

export function getExpensesByMember(transactions = TRANSACTIONS) {
  return getRealExpenses(transactions).reduce((accumulator, transaction) => {
    accumulator[transaction.userId] = (accumulator[transaction.userId] || 0) + Math.abs(transaction.amountUzs)
    return accumulator
  }, {})
}

export function getTotalExpenses(transactions = TRANSACTIONS) {
  return getRealExpenses(transactions).reduce(
    (sum, transaction) => sum + Math.abs(transaction.amountUzs),
    0
  )
}

// 3. MONTH OVER MONTH
export function getMonthOverMonthChange(transactions = TRANSACTIONS, referenceDate = new Date()) {
  const monthTransactions = getMonthTransactions(transactions, referenceDate)
  const thisMonth = getExpensesByCategory(monthTransactions)
  const lastMonth = LAST_MONTH_STATS.byCategory
  const totalThis = getTotalExpenses(monthTransactions)
  const totalLast = LAST_MONTH_STATS.totalExpensesUzs

  const byCategory = {}
  const allCategories = new Set([...Object.keys(thisMonth), ...Object.keys(lastMonth)])

  allCategories.forEach((category) => {
    const current = thisMonth[category] || 0
    const previous = lastMonth[category] || 0

    if (previous > 0) {
      byCategory[category] = Math.round(((current - previous) / previous) * 100)
    } else if (current > 0) {
      byCategory[category] = 100
    }
  })

  const total = totalLast > 0 ? Math.round(((totalThis - totalLast) / totalLast) * 100) : 0

  return {
    total,
    byCategory,
  }
}

export function getTopAnomalies(transactions = TRANSACTIONS, referenceDate = new Date()) {
  const changes = getMonthOverMonthChange(transactions, referenceDate)

  return Object.entries(changes.byCategory)
    .filter(([, pct]) => pct > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category, changePercent]) => ({
      category,
      label: CATEGORIES[category]?.label || category,
      emoji: CATEGORIES[category]?.emoji || '📊',
      changePercent,
    }))
}

// 4. BUDGET FORECAST
export function getBudgetForecast(transactions = TRANSACTIONS, referenceDate = new Date()) {
  const today = toDate(referenceDate) ?? new Date()
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - dayOfMonth

  const monthTransactions = getMonthTransactions(transactions, today)
  const spent = getTotalExpenses(monthTransactions)
  const dailyAvg = dayOfMonth > 0 ? spent / dayOfMonth : 0
  const projected = Math.round(spent + dailyAvg * daysLeft)

  return {
    spent,
    projected,
    daysLeft,
    dailyAvg: Math.round(dailyAvg),
  }
}

export function getTotalBalance(accounts = ACCOUNTS) {
  return accounts
    .filter((account) => account.type !== 'deposit')
    .reduce((sum, account) => {
      if (account.currency && account.currency !== 'UZS') {
        return sum
      }
      return sum + Number(account.balanceUzs ?? 0)
    }, 0)
}

/** Сумма по платёжным картам/счетам (без вкладов) и привязанным картам HUMO/UZCARD для пользователя. */
export function getPaymentCardsTotalUzs(
  userId,
  accounts = ACCOUNTS,
  linkedCards = LINKED_EXTERNAL_CARDS
) {
  const fromAccounts = accounts
    .filter((a) => a.userId === userId && a.type !== 'deposit')
    .reduce((sum, a) => {
      if (a.currency && a.currency !== 'UZS') {
        return sum
      }
      return sum + Number(a.balanceUzs ?? 0)
    }, 0)
  const fromLinked = linkedCards
    .filter((c) => c.ownerUserId === userId)
    .reduce((sum, c) => sum + (typeof c.balanceUzs === 'number' ? c.balanceUzs : 0), 0)
  return Math.round((fromAccounts + fromLinked) * 100) / 100
}

export function getMemberBalance(userId, accounts = ACCOUNTS) {
  return accounts
    .filter((account) => account.userId === userId && account.type !== 'deposit')
    .reduce((sum, account) => {
      if (account.currency && account.currency !== 'UZS') {
        return sum
      }
      return sum + Number(account.balanceUzs ?? 0)
    }, 0)
}

// 5. GOALS
export function calculateGoalProgress(goal, referenceDate = new Date()) {
  const { targetAmountUzs, savedAmountUzs, monthlyDepositUzs, targetDate } = goal

  const progress = Math.round((savedAmountUzs / targetAmountUzs) * 100)
  const remaining = Math.max(0, targetAmountUzs - savedAmountUzs)

  const today = toDate(referenceDate) ?? new Date()
  const target = toDate(targetDate) ?? today

  const monthsLeft = Math.max(
    0,
    (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth())
  )

  const projectedSaved = savedAmountUzs + monthlyDepositUzs * monthsLeft
  const willReach = projectedSaved >= targetAmountUzs
  const monthsNeeded = monthlyDepositUzs > 0 ? Math.ceil(remaining / monthlyDepositUzs) : null

  return {
    progress,
    remaining,
    monthsLeft,
    willReach,
    monthsNeeded,
    projectedSaved,
  }
}

export function calcRequiredMonthlyDeposit(goal, referenceDate = new Date()) {
  const { targetAmountUzs, savedAmountUzs, targetDate } = goal

  const today = toDate(referenceDate) ?? new Date()
  const target = toDate(targetDate) ?? today

  const months = Math.max(
    1,
    (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth())
  )

  return Math.ceil(Math.max(0, targetAmountUzs - savedAmountUzs) / months)
}

// 6. FORMATTING
export function formatMoney(amount) {
  const sign = amount < 0 ? '-' : ''
  const value = Math.abs(Math.round(amount))
  return `${sign}${new Intl.NumberFormat('ru-RU').format(value)} UZS`
}

export function formatMoneyShort(amount) {
  const sign = amount < 0 ? '-' : ''
  const value = Math.abs(amount)

  if (value >= 1_000_000_000) {
    return `${sign}${(value / 1_000_000_000).toFixed(1)} млрд`
  }
  if (value >= 1_000_000) {
    return `${sign}${(value / 1_000_000).toFixed(1)} млн`
  }
  if (value >= 1_000) {
    return `${sign}${Math.round(value / 1_000)} тыс`
  }

  return `${sign}${Math.round(value)}`
}

export function getChangeColor(pct) {
  if (pct > 10) {
    return 'var(--danger)'
  }
  if (pct > 0) {
    return 'var(--warning)'
  }
  return 'var(--success)'
}

export function getChangeTagClass(pct) {
  if (pct > 10) {
    return 'tag-danger'
  }
  if (pct > 0) {
    return 'tag-warning'
  }
  return 'tag-success'
}

// 7. CHART DATA
export function getCategoryChartData(transactions = TRANSACTIONS, referenceDate = new Date()) {
  const monthTransactions = getMonthTransactions(transactions, referenceDate)
  const byCategory = getExpensesByCategory(monthTransactions)
  const lastMonthByCategory = LAST_MONTH_STATS.byCategory

  return Object.entries(byCategory)
    .map(([category, amount]) => ({
      name: CATEGORIES[category]?.label || category,
      emoji: CATEGORIES[category]?.emoji || '📊',
      color: CATEGORIES[category]?.color || '#4cd6fb',
      current: Math.round(amount / 1000),
      previous: Math.round((lastMonthByCategory[category] || 0) / 1000),
    }))
    .sort((a, b) => b.current - a.current)
}

export function getPieChartData(transactions = TRANSACTIONS, referenceDate = new Date()) {
  const monthTransactions = getMonthTransactions(transactions, referenceDate)
  const byCategory = getExpensesByCategory(monthTransactions)
  const total = Object.values(byCategory).reduce((sum, value) => sum + value, 0)

  return Object.entries(byCategory)
    .map(([category, amount]) => ({
      name: CATEGORIES[category]?.label || category,
      value: Math.round(amount / 1000),
      color: CATEGORIES[category]?.color || '#4cd6fb',
      percent: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
}

// 8. MCC / CATEGORY EXPLANATION HELPERS
export function getMccRules() {
  return MCC_CATEGORY_RULES
}

export function getExpensesByMcc(transactions = TRANSACTIONS) {
  const realExpenses = getRealExpenses(transactions)

  return realExpenses
    .reduce((accumulator, transaction) => {
      const mccKey = transaction.mcc ?? 'unknown'

      if (!accumulator[mccKey]) {
        accumulator[mccKey] = {
          mcc: transaction.mcc,
          category: resolveCategoryByMcc(transaction.mcc, transaction.category ?? 'other'),
          totalUzs: 0,
          count: 0,
        }
      }

      accumulator[mccKey].totalUzs += Math.abs(transaction.amountUzs)
      accumulator[mccKey].count += 1
      return accumulator
    }, {})
}

// 9. AI CONTEXT
export function buildAIContext(transactions = TRANSACTIONS, referenceDate = new Date()) {
  const monthTransactions = getMonthTransactions(transactions, referenceDate)
  const totalExpenses = getTotalExpenses(monthTransactions)
  const byCategory = getExpensesByCategory(monthTransactions)
  const changes = getMonthOverMonthChange(transactions, referenceDate)
  const forecast = getBudgetForecast(transactions, referenceDate)
  const totalBalance = getTotalBalance()

  const categoryLines = Object.entries(byCategory)
    .map(([category, amount]) => {
      const pct = changes.byCategory[category] ?? 0
      const sign = pct > 0 ? `+${pct}%` : `${pct}%`
      return `- ${CATEGORIES[category]?.label || category}: ${formatMoneyShort(amount)} (${sign} к пред. месяцу)`
    })
    .join('\n')

  return `
Данные семейного бюджета за текущий месяц:

Общий баланс (живые деньги): ${formatMoney(totalBalance)}
Реальные расходы за месяц: ${formatMoney(totalExpenses)}
Изменение к прошлому месяцу: ${changes.total > 0 ? '+' : ''}${changes.total}%
Прогноз расходов до конца месяца: ${formatMoney(forecast.projected)}
Осталось дней в месяце: ${forecast.daysLeft}
Средний расход в день: ${formatMoney(forecast.dailyAvg)}

Расходы по категориям:
${categoryLines}

Семья из ${FAMILY_MEMBERS.length} человек.
Внутренние переводы между своими счетами, членами семьи и вкладами исключены из расчета.
  `.trim()
}

export { FILTER_PERIODS, GOALS, TRANSACTIONS }
