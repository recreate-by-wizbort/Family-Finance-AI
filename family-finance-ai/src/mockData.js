// mockData.js
// MVP-ready mock dataset that mirrors a potential banking API contract.

export const MOCK_DATA_META = {
  version: '1.1.0',
  generatedAt: '2026-04-10T12:00:00+05:00',
  currency: 'UZS',
  locale: 'ru-UZ',
  timezone: 'Asia/Tashkent',
}

export const FAMILY_MEMBERS = [
  { id: 'user_1', name: 'Alisher', role: 'owner', avatar: 'A', color: '#4cd6fb' },
  { id: 'user_2', name: 'Malika', role: 'spouse', avatar: 'M', color: '#58d6f1' },
  { id: 'user_3', name: 'Timur', role: 'child', avatar: 'T', color: '#22c55e' },
]

export const FAMILY_GROUP = {
  id: 'family_1',
  ownerUserId: 'user_1',
  memberIds: ['user_1', 'user_2', 'user_3'],
  consent: [
    { userId: 'user_1', acceptedAt: '2026-03-01T10:00:00+05:00' },
    { userId: 'user_2', acceptedAt: '2026-03-01T10:02:00+05:00' },
    { userId: 'user_3', acceptedAt: '2026-03-01T10:05:00+05:00' },
  ],
}

export const ACCOUNTS = [
  {
    id: 'acc_tbc_main',
    userId: 'user_1',
    bank: 'TBC Uzbekistan',
    type: 'debit',
    currency: 'UZS',
    balanceUzs: 4850000,
    label: 'Main card',
    isOwn: true,
  },
  {
    id: 'acc_nbu_salary',
    userId: 'user_1',
    bank: 'NBU',
    type: 'salary',
    currency: 'UZS',
    balanceUzs: 12200000,
    label: 'Salary card',
    isOwn: true,
  },
  {
    id: 'acc_tbc_deposit',
    userId: 'user_1',
    bank: 'TBC Uzbekistan',
    type: 'deposit',
    currency: 'UZS',
    balanceUzs: 8500000,
    label: 'Deposit 12%',
    isOwn: true,
  },
  {
    id: 'acc_kapital_malika',
    userId: 'user_2',
    bank: 'Kapital Bank',
    type: 'debit',
    currency: 'UZS',
    balanceUzs: 2100000,
    label: 'Malika card',
    isOwn: true,
  },
  {
    id: 'acc_uzum_timur',
    userId: 'user_3',
    bank: 'Uzum Bank',
    type: 'debit',
    currency: 'UZS',
    balanceUzs: 650000,
    label: 'Timur card',
    isOwn: true,
  },
]

// Cards from other banks linked manually as "my cards" for multi-bank transfer filtering.
export const LINKED_EXTERNAL_CARDS = [
  {
    id: 'ext_card_1',
    ownerUserId: 'user_1',
    bank: 'TBC Uzbekistan',
    cardMask: '8600 **** **** 4402',
    processingSystem: 'HUMO',
    markedAsOwn: true,
    includedInAnalytics: true,
  },
  {
    id: 'ext_card_2',
    ownerUserId: 'user_1',
    bank: 'Kapital Bank',
    cardMask: '8600 **** **** 9911',
    processingSystem: 'UZCARD',
    markedAsOwn: true,
    includedInAnalytics: true,
  },
]

export const NON_EXPENSE_KINDS = ['transfer_internal', 'transfer_family', 'goal_topup']

export const FILTER_PERIODS = ['7d', '30d', '90d', '180d', '365d', 'mtd', 'ytd', 'custom']

// MCC -> category mapping to demonstrate card-operations classification logic.
export const MCC_CATEGORY_RULES = {
  5411: 'groceries',
  5499: 'groceries',
  4121: 'transport',
  4111: 'transport',
  5812: 'restaurants',
  5814: 'restaurants',
  5311: 'shopping',
  5651: 'clothes',
  5912: 'health',
  7832: 'entertainment',
  5816: 'entertainment',
  5541: 'car',
  4899: 'subscriptions',
  5734: 'subscriptions',
  7372: 'subscriptions',
  7538: 'car',
}

export function resolveCategoryByMcc(mcc, fallbackCategory = 'shopping') {
  if (mcc == null) {
    return fallbackCategory
  }

  return MCC_CATEGORY_RULES[mcc] ?? fallbackCategory
}

const YEAR_MONTHS = [
  { year: 2025, month: 5 },
  { year: 2025, month: 6 },
  { year: 2025, month: 7 },
  { year: 2025, month: 8 },
  { year: 2025, month: 9 },
  { year: 2025, month: 10 },
  { year: 2025, month: 11 },
  { year: 2025, month: 12 },
  { year: 2026, month: 1 },
  { year: 2026, month: 2 },
  { year: 2026, month: 3 },
  { year: 2026, month: 4 },
]

const PURCHASE_TEMPLATES = [
  {
    day: 3,
    hour: 13,
    minute: 5,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Korzinka',
    category: 'groceries',
    mcc: 5411,
    description: 'Groceries',
    baseAmountUzs: 470000,
    seed: 1,
  },
  {
    day: 4,
    hour: 8,
    minute: 25,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Yandex Taxi',
    category: 'transport',
    mcc: 4121,
    description: 'Taxi',
    baseAmountUzs: 95000,
    seed: 2,
  },
  {
    day: 5,
    hour: 15,
    minute: 10,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Makro',
    category: 'groceries',
    mcc: 5411,
    description: 'Groceries',
    baseAmountUzs: 320000,
    seed: 3,
  },
  {
    day: 6,
    hour: 20,
    minute: 35,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Plov Centre',
    category: 'restaurants',
    mcc: 5812,
    description: 'Dinner',
    baseAmountUzs: 185000,
    seed: 4,
  },
  {
    day: 8,
    hour: 19,
    minute: 40,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Zara',
    category: 'clothes',
    mcc: 5651,
    description: 'Clothes',
    baseAmountUzs: 740000,
    seed: 5,
  },
  {
    day: 10,
    hour: 18,
    minute: 15,
    userId: 'user_3',
    accountId: 'acc_uzum_timur',
    merchant: 'Steam',
    category: 'entertainment',
    mcc: 5816,
    description: 'Game purchase',
    baseAmountUzs: 90000,
    seed: 6,
  },
  {
    day: 11,
    hour: 16,
    minute: 20,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Uzum Market',
    category: 'shopping',
    mcc: 5311,
    description: 'Household shopping',
    baseAmountUzs: 510000,
    seed: 7,
  },
  {
    day: 13,
    hour: 12,
    minute: 10,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'iHerb',
    category: 'health',
    mcc: 5912,
    description: 'Health purchase',
    baseAmountUzs: 170000,
    seed: 8,
  },
  {
    day: 16,
    hour: 10,
    minute: 30,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Baraka Market',
    category: 'groceries',
    mcc: 5411,
    description: 'Groceries',
    baseAmountUzs: 380000,
    seed: 9,
  },
  {
    day: 18,
    hour: 9,
    minute: 15,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Yandex Taxi',
    category: 'transport',
    mcc: 4121,
    description: 'Taxi',
    baseAmountUzs: 115000,
    seed: 10,
  },
  {
    day: 20,
    hour: 21,
    minute: 0,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Sushi Wok',
    category: 'restaurants',
    mcc: 5812,
    description: 'Dinner',
    baseAmountUzs: 240000,
    seed: 11,
  },
  {
    day: 22,
    hour: 14,
    minute: 50,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Korzinka',
    category: 'groceries',
    mcc: 5411,
    description: 'Family groceries',
    baseAmountUzs: 290000,
    seed: 12,
  },
  {
    day: 24,
    hour: 8,
    minute: 5,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Yandex Taxi',
    category: 'transport',
    mcc: 4121,
    description: 'Taxi',
    baseAmountUzs: 98000,
    seed: 13,
  },
  {
    day: 26,
    hour: 12,
    minute: 20,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Autoservice',
    category: 'car',
    mcc: 7538,
    description: 'Car maintenance',
    baseAmountUzs: 780000,
    seed: 14,
    everyNMonths: 2,
  },
  {
    day: 27,
    hour: 11,
    minute: 10,
    userId: 'user_3',
    accountId: 'acc_uzum_timur',
    merchant: 'Korzinka',
    category: 'groceries',
    mcc: 5411,
    description: 'School groceries',
    baseAmountUzs: 110000,
    seed: 15,
  },
]

const WEEKLY_PURCHASE_TEMPLATES = [
  {
    startDay: 2,
    hour: 19,
    minute: 15,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Korzinka Express',
    mcc: 5411,
    fallbackCategory: 'groceries',
    description: 'Weekly groceries',
    baseAmountUzs: 210000,
    seed: 40,
  },
  {
    startDay: 3,
    hour: 8,
    minute: 40,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Yandex Taxi',
    mcc: 4121,
    fallbackCategory: 'transport',
    description: 'City commute',
    baseAmountUzs: 65000,
    seed: 41,
  },
  {
    startDay: 4,
    hour: 13,
    minute: 20,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Coffee Spot',
    mcc: 5814,
    fallbackCategory: 'restaurants',
    description: 'Cafe',
    baseAmountUzs: 45000,
    seed: 42,
  },
  {
    startDay: 5,
    hour: 18,
    minute: 30,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Uzum Market',
    mcc: 5311,
    fallbackCategory: 'shopping',
    description: 'Marketplace order',
    baseAmountUzs: 180000,
    seed: 43,
  },
  {
    startDay: 6,
    hour: 21,
    minute: 10,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Cinema Tickets',
    mcc: 7832,
    fallbackCategory: 'entertainment',
    description: 'Weekend entertainment',
    baseAmountUzs: 120000,
    seed: 44,
  },
  {
    startDay: 7,
    hour: 11,
    minute: 55,
    userId: 'user_3',
    accountId: 'acc_uzum_timur',
    merchant: 'Game TopUp',
    mcc: 5816,
    fallbackCategory: 'entertainment',
    description: 'Game top-up',
    baseAmountUzs: 55000,
    seed: 45,
  },
  {
    startDay: 9,
    hour: 9,
    minute: 30,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Pharmacy 24',
    mcc: 5912,
    fallbackCategory: 'health',
    description: 'Pharmacy',
    baseAmountUzs: 76000,
    seed: 46,
  },
  {
    startDay: 11,
    hour: 12,
    minute: 0,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Fuel Station',
    mcc: 5541,
    fallbackCategory: 'car',
    description: 'Fuel',
    baseAmountUzs: 220000,
    seed: 47,
  },
]

function pad2(value) {
  return String(value).padStart(2, '0')
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function toTimestamp(year, month, day, hour, minute) {
  const safeDay = Math.min(day, daysInMonth(year, month))
  return `${year}-${pad2(month)}-${pad2(safeDay)}T${pad2(hour)}:${pad2(minute)}:00+05:00`
}

function amountWithVariation(baseAmountUzs, monthIndex, seed, minAmountUzs = 10000) {
  const delta = ((monthIndex + 1) * 137 + seed * 83) % 90001 - 45000
  return Math.max(minAmountUzs, baseAmountUzs + delta)
}

function buildYearTransactions() {
  let txIndex = 1

  const nextTxId = () => {
    const txId = `tx_${String(txIndex).padStart(4, '0')}`
    txIndex += 1
    return txId
  }

  const transactions = []

  YEAR_MONTHS.forEach(({ year, month }, monthIndex) => {
    const monthCode = `${year}-${pad2(month)}`

    let salaryAmountUzs = amountWithVariation(18500000, monthIndex, 90, 17000000)
    if (month === 12) {
      salaryAmountUzs += 4000000
    }

    const ownTransferAmountUzs = Math.round(salaryAmountUzs * (0.52 + (monthIndex % 4) * 0.03))
    const familyTransferAmountUzs = amountWithVariation(1450000, monthIndex, 91, 1050000)
    const depositTopupAmountUzs = amountWithVariation(820000, monthIndex, 95, 500000)
    const depositWithdrawalAmountUzs = amountWithVariation(640000, monthIndex, 96, 350000)
    const goalTopupAmountUzs = amountWithVariation(1900000, monthIndex, 92, 1200000)
    const netflixAmountUzs = amountWithVariation(45000, monthIndex, 93, 30000)
    const aiSubAmountUzs = amountWithVariation(25000, monthIndex, 94, 15000)

    transactions.push(
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 1, 9, 5),
        userId: 'user_1',
        accountId: 'acc_nbu_salary',
        kind: 'income',
        direction: 'in',
        mcc: null,
        amountUzs: salaryAmountUzs,
        merchant: 'TechnoSoft LLC',
        category: 'income',
        description: `Salary ${monthCode}`,
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 1, 9, 25),
        userId: 'user_1',
        accountId: 'acc_nbu_salary',
        kind: 'transfer_internal',
        direction: 'out',
        mcc: null,
        amountUzs: ownTransferAmountUzs,
        merchant: 'Own card transfer',
        category: 'internal',
        description: 'NBU -> TBC main',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 1, 9, 26),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'transfer_internal',
        direction: 'in',
        mcc: null,
        amountUzs: ownTransferAmountUzs,
        merchant: 'From salary card',
        category: 'internal',
        description: 'NBU -> TBC main',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 2, 11, 40),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'transfer_family',
        direction: 'out',
        mcc: null,
        amountUzs: familyTransferAmountUzs,
        merchant: 'Malika',
        category: 'family',
        description: 'Family transfer',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 2, 11, 42),
        userId: 'user_2',
        accountId: 'acc_kapital_malika',
        kind: 'transfer_family',
        direction: 'in',
        mcc: null,
        amountUzs: familyTransferAmountUzs,
        merchant: 'From Alisher',
        category: 'family',
        description: 'Family transfer',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 3, 9, 55),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'transfer_internal',
        direction: 'out',
        mcc: null,
        amountUzs: depositTopupAmountUzs,
        merchant: 'Transfer to deposit',
        category: 'internal',
        description: 'Main -> Deposit',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 3, 9, 56),
        userId: 'user_1',
        accountId: 'acc_tbc_deposit',
        kind: 'transfer_internal',
        direction: 'in',
        mcc: null,
        amountUzs: depositTopupAmountUzs,
        merchant: 'From main card',
        category: 'internal',
        description: 'Main -> Deposit',
      },
    )

    if (monthIndex % 3 === 2) {
      transactions.push(
        {
          id: nextTxId(),
          timestamp: toTimestamp(year, month, 23, 18, 30),
          userId: 'user_1',
          accountId: 'acc_tbc_deposit',
          kind: 'transfer_internal',
          direction: 'out',
          mcc: null,
          amountUzs: depositWithdrawalAmountUzs,
          merchant: 'Transfer from deposit',
          category: 'internal',
          description: 'Deposit -> Main',
        },
        {
          id: nextTxId(),
          timestamp: toTimestamp(year, month, 23, 18, 31),
          userId: 'user_1',
          accountId: 'acc_tbc_main',
          kind: 'transfer_internal',
          direction: 'in',
          mcc: null,
          amountUzs: depositWithdrawalAmountUzs,
          merchant: 'From deposit',
          category: 'internal',
          description: 'Deposit -> Main',
        },
      )
    }

    PURCHASE_TEMPLATES.forEach((template) => {
      if (template.everyNMonths && monthIndex % template.everyNMonths !== 0) {
        return
      }

      transactions.push({
        id: nextTxId(),
        timestamp: toTimestamp(year, month, template.day, template.hour, template.minute),
        userId: template.userId,
        accountId: template.accountId,
        kind: 'purchase',
        direction: 'out',
        mcc: template.mcc,
        amountUzs: amountWithVariation(template.baseAmountUzs, monthIndex, template.seed),
        merchant: template.merchant,
        category: resolveCategoryByMcc(template.mcc, template.category),
        description: template.description,
      })
    })

    WEEKLY_PURCHASE_TEMPLATES.forEach((template) => {
      for (let day = template.startDay; day <= daysInMonth(year, month); day += 7) {
        transactions.push({
          id: nextTxId(),
          timestamp: toTimestamp(year, month, day, template.hour, template.minute),
          userId: template.userId,
          accountId: template.accountId,
          kind: 'purchase',
          direction: 'out',
          mcc: template.mcc,
          amountUzs: amountWithVariation(template.baseAmountUzs, monthIndex, template.seed + day),
          merchant: template.merchant,
          category: resolveCategoryByMcc(template.mcc, template.fallbackCategory),
          description: template.description,
        })
      }
    })

    transactions.push(
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 12, 10, 35),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'subscription',
        direction: 'out',
        mcc: 4899,
        amountUzs: netflixAmountUzs,
        merchant: 'Netflix',
        category: resolveCategoryByMcc(4899, 'subscriptions'),
        description: 'Monthly subscription',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 12, 10, 37),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'subscription',
        direction: 'out',
        mcc: 5734,
        amountUzs: aiSubAmountUzs,
        merchant: 'ChatGPT Plus',
        category: resolveCategoryByMcc(5734, 'subscriptions'),
        description: 'AI subscription',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 14, 21, 0),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'goal_topup',
        direction: 'out',
        mcc: null,
        amountUzs: goalTopupAmountUzs,
        merchant: 'Deposit 12%',
        category: 'internal',
        description: 'Top up savings goal',
      },
    )
  })

  return transactions
}

function calculateMonthlyExpenseStats(transactions, yearMonth) {
  const byCategory = {}
  let totalExpensesUzs = 0

  transactions.forEach((transaction) => {
    if (!transaction.timestamp.startsWith(yearMonth)) {
      return
    }

    const isExpense = transaction.direction === 'out' && !NON_EXPENSE_KINDS.includes(transaction.kind)
    if (!isExpense) {
      return
    }

    totalExpensesUzs += transaction.amountUzs
    byCategory[transaction.category] = (byCategory[transaction.category] ?? 0) + transaction.amountUzs
  })

  return {
    totalExpensesUzs,
    byCategory,
  }
}

export const TRANSACTIONS = buildYearTransactions()

export const LAST_MONTH_STATS = calculateMonthlyExpenseStats(TRANSACTIONS, '2026-03')

export const GOALS = [
  {
    id: 'goal_1',
    title: 'Buy a car',
    emoji: '🚗',
    targetAmountUzs: 80000000,
    savedAmountUzs: 8500000,
    monthlyDepositUzs: 1200000,
    targetDate: '2027-09-01',
    color: '#4cd6fb',
  },
  {
    id: 'goal_2',
    title: 'Family vacation',
    emoji: '✈️',
    targetAmountUzs: 8000000,
    savedAmountUzs: 1800000,
    monthlyDepositUzs: 600000,
    targetDate: '2026-08-01',
    color: '#22c55e',
  },
  {
    id: 'goal_3',
    title: 'Emergency fund',
    emoji: '🛡️',
    targetAmountUzs: 30000000,
    savedAmountUzs: 5200000,
    monthlyDepositUzs: 800000,
    targetDate: '2028-01-01',
    color: '#f59e0b',
  },
]

export const SURPRISE_GOALS = [
  {
    id: 'surprise_1',
    title: 'Gift for 8 March',
    emoji: '🎁',
    amountUzs: 500000,
    revealDate: '2027-03-08',
    hiddenFromFamily: true,
    status: 'active',
  },
]

export const CATEGORIES = {
  groceries: { label: 'Продукты', emoji: '🛒', color: '#22c55e' },
  transport: { label: 'Транспорт', emoji: '🚕', color: '#3b82f6' },
  restaurants: { label: 'Рестораны', emoji: '🍽️', color: '#f97316' },
  subscriptions: { label: 'Подписки', emoji: '📱', color: '#a855f7' },
  entertainment: { label: 'Развлечения', emoji: '🎬', color: '#ec4899' },
  clothes: { label: 'Одежда', emoji: '👗', color: '#14b8a6' },
  shopping: { label: 'Покупки', emoji: '🛍️', color: '#8b5cf6' },
  health: { label: 'Здоровье', emoji: '💊', color: '#ef4444' },
  car: { label: 'Авто', emoji: '🔧', color: '#64748b' },
  internal: { label: 'Внутренний перевод', emoji: '↔️', color: '#94a3b8' },
  family: { label: 'Семейный перевод', emoji: '👨‍👩‍👦', color: '#fbbf24' },
  income: { label: 'Доход', emoji: '💰', color: '#22c55e' },
}

export const NOTIFICATIONS = [
  {
    id: 'notif_1',
    type: 'alert',
    title: 'Spending anomaly',
    body: 'Transport spending is up by 26% compared to last week.',
    isNew: true,
    createdAt: '2026-04-10T11:00:00+05:00',
  },
  {
    id: 'notif_2',
    type: 'goal',
    title: 'Goal progress updated',
    body: 'Family vacation goal reached 41%.',
    isNew: true,
    createdAt: '2026-04-10T10:45:00+05:00',
  },
  {
    id: 'notif_3',
    type: 'ai',
    title: 'AI recommendation',
    body: 'You can move 180,000 UZS to emergency fund this week.',
    isNew: false,
    createdAt: '2026-04-10T09:10:00+05:00',
  },
]

export const EXCHANGE_RATE_SNAPSHOT = {
  base: 'UZS',
  USD: { rate: 12198, diff: -30.3 },
  EUR: { rate: 13220, diff: -21.7 },
  fetchedAt: '2026-04-10T08:00:00+05:00',
}

export function isRealExpense(transaction) {
  return transaction.direction === 'out' && !NON_EXPENSE_KINDS.includes(transaction.kind)
}

export const MOCK_API_RESPONSES = {
  '/v1/family/members': FAMILY_MEMBERS,
  '/v1/family/group': FAMILY_GROUP,
  '/v1/accounts': ACCOUNTS,
  '/v1/cards/external-linked': LINKED_EXTERNAL_CARDS,
  '/v1/mcc-rules': MCC_CATEGORY_RULES,
  '/v1/transactions': TRANSACTIONS,
  '/v1/goals': GOALS,
  '/v1/goals/surprise': SURPRISE_GOALS,
  '/v1/notifications': NOTIFICATIONS,
  '/v1/exchange-rates': EXCHANGE_RATE_SNAPSHOT,
}

export function getMockApiResponse(endpoint) {
  const payload = MOCK_API_RESPONSES[endpoint]
  if (!payload) {
    return null
  }

  return JSON.parse(JSON.stringify(payload))
}
