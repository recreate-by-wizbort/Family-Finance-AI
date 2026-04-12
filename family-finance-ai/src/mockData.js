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

/** Основной банк владельца счёта (платёжные карты и вклад в моках). */
export const PRIMARY_BANK_RECREATE = 'BANK OF RECREATE BY WIZBORT'

export const DEFAULT_CARDHOLDER_NAME = 'ANDREY IVANOV'

export const ACCOUNTS = [
  {
    id: 'acc_tbc_main',
    userId: 'user_1',
    bank: PRIMARY_BANK_RECREATE,
    type: 'debit',
    currency: 'UZS',
    balanceUzs: 4850234.18,
    label: 'Основная карта',
    isOwn: true,
    card: {
      pan: '8600555012341234',
      expires: '09/28',
      processingSystem: 'HUMO',
      holderName: DEFAULT_CARDHOLDER_NAME,
      accentColor: '#22c55e',
    },
  },
  {
    id: 'acc_nbu_salary',
    userId: 'user_1',
    bank: PRIMARY_BANK_RECREATE,
    type: 'salary',
    currency: 'USD',
    balanceUzs: 0,
    balanceForeign: 486.42,
    label: 'Счёт в долларах',
    isOwn: true,
    card: {
      pan: '5614680090127890',
      expires: '03/27',
      processingSystem: 'UZCARD',
      holderName: DEFAULT_CARDHOLDER_NAME,
      accentColor: '#3b82f6',
    },
  },
  {
    id: 'acc_tbc_deposit',
    userId: 'user_1',
    bank: PRIMARY_BANK_RECREATE,
    type: 'deposit',
    currency: 'UZS',
    balanceUzs: 8500000,
    label: 'Вклад 12%',
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
  {
    id: 'acc_hamkor_current',
    userId: 'user_1',
    bank: PRIMARY_BANK_RECREATE,
    type: 'debit',
    currency: 'EUR',
    balanceUzs: 0,
    balanceForeign: 503.18,
    label: 'Счёт в евро',
    isOwn: true,
    card: {
      pan: '9860600433221100',
      expires: '12/31',
      processingSystem: 'UZCARD',
      holderName: DEFAULT_CARDHOLDER_NAME,
      accentColor: '#0d9488',
    },
  },
]

// Cards from other banks linked manually as "my cards" for multi-bank transfer filtering.
export const LINKED_EXTERNAL_CARDS = [
  {
    id: 'ext_card_1',
    ownerUserId: 'user_1',
    bank: PRIMARY_BANK_RECREATE,
    userLabel: 'Золотая HUMO',
    cardMask: '8600 **** **** 4402',
    pan: '8600123456784402',
    expires: '11/29',
    processingSystem: 'HUMO',
    holderName: DEFAULT_CARDHOLDER_NAME,
    balanceUzs: 3200912.77,
    accentColor: '#f97316',
    markedAsOwn: true,
    includedInAnalytics: true,
  },
  {
    id: 'ext_card_2',
    ownerUserId: 'user_1',
    bank: 'Kapital Bank',
    userLabel: 'Капитал основная',
    cardMask: '8600 **** **** 9911',
    pan: '8600987654329911',
    expires: '05/30',
    processingSystem: 'UZCARD',
    holderName: DEFAULT_CARDHOLDER_NAME,
    balanceUzs: 2100150.06,
    accentColor: '#8b5cf6',
    markedAsOwn: true,
    includedInAnalytics: true,
  },
  {
    id: 'ext_card_visa',
    ownerUserId: 'user_1',
    bank: 'Trastbank',
    userLabel: 'Виза для путешествий',
    cardMask: '4532 **** **** 0366',
    pan: '4532015112830366',
    expires: '08/27',
    processingSystem: 'VISA',
    holderName: DEFAULT_CARDHOLDER_NAME,
    balanceUzs: 892340.55,
    accentColor: '#15803d',
    markedAsOwn: true,
    includedInAnalytics: true,
  },
  {
    id: 'ext_card_mc',
    ownerUserId: 'user_1',
    bank: 'Tenge Bank',
    userLabel: 'Премиум Mastercard',
    cardMask: '5425 **** **** 0698',
    pan: '5425233430100698',
    expires: '01/29',
    processingSystem: 'MASTERCARD',
    holderName: DEFAULT_CARDHOLDER_NAME,
    balanceUzs: 1567890.12,
    accentColor: '#ea580c',
    markedAsOwn: true,
    includedInAnalytics: true,
  },
]

/** Движения по валютным счетам (суммы в валюте счёта). */
export const FOREIGN_ACCOUNT_MOVEMENTS = {
  acc_nbu_salary: [
    { id: 'fx_usd_1', timestamp: '2026-04-10T11:20:00+05:00', direction: 'in', amountForeign: 150, currency: 'USD', merchant: 'Wise', description: 'Поступление перевода' },
    { id: 'fx_usd_2', timestamp: '2026-04-09T16:45:00+05:00', direction: 'out', amountForeign: 42.35, currency: 'USD', merchant: 'Amazon', description: 'Онлайн-заказ' },
    { id: 'fx_usd_3', timestamp: '2026-04-08T09:10:00+05:00', direction: 'out', amountForeign: 18.9, currency: 'USD', merchant: 'Spotify', description: 'Подписка' },
    { id: 'fx_usd_4', timestamp: '2026-04-05T14:00:00+05:00', direction: 'in', amountForeign: 397.67, currency: 'USD', merchant: 'Exchange', description: 'Обмен валюты' },
    { id: 'fx_usd_5', timestamp: '2026-04-03T10:30:00+05:00', direction: 'out', amountForeign: 12.99, currency: 'USD', merchant: 'ChatGPT Plus', description: 'Подписка AI' },
    { id: 'fx_usd_6', timestamp: '2026-04-01T15:20:00+05:00', direction: 'out', amountForeign: 29.99, currency: 'USD', merchant: 'Udemy', description: 'Онлайн-курс' },
    { id: 'fx_usd_7', timestamp: '2026-03-30T09:00:00+05:00', direction: 'in', amountForeign: 200, currency: 'USD', merchant: 'Freelance', description: 'Оплата за проект' },
    { id: 'fx_usd_8', timestamp: '2026-03-28T17:15:00+05:00', direction: 'out', amountForeign: 55.80, currency: 'USD', merchant: 'Amazon', description: 'Электроника' },
    { id: 'fx_usd_9', timestamp: '2026-03-25T11:40:00+05:00', direction: 'out', amountForeign: 9.99, currency: 'USD', merchant: 'Netflix', description: 'Подписка' },
    { id: 'fx_usd_10', timestamp: '2026-03-22T14:00:00+05:00', direction: 'in', amountForeign: 100, currency: 'USD', merchant: 'Перевод', description: 'От друга' },
  ],
  acc_hamkor_current: [
    { id: 'fx_eur_1', timestamp: '2026-04-10T08:30:00+05:00', direction: 'in', amountForeign: 220, currency: 'EUR', merchant: 'Revolut', description: 'Входящий перевод' },
    { id: 'fx_eur_2', timestamp: '2026-04-09T19:15:00+05:00', direction: 'out', amountForeign: 67.25, currency: 'EUR', merchant: 'Booking.com', description: 'Бронирование' },
    { id: 'fx_eur_3', timestamp: '2026-04-07T12:40:00+05:00', direction: 'out', amountForeign: 35.5, currency: 'EUR', merchant: 'Ресторан', description: 'Обед' },
    { id: 'fx_eur_4', timestamp: '2026-04-04T10:05:00+05:00', direction: 'in', amountForeign: 385.93, currency: 'EUR', merchant: 'Обменный пункт', description: 'Покупка евро' },
    { id: 'fx_eur_5', timestamp: '2026-04-02T16:30:00+05:00', direction: 'out', amountForeign: 24.99, currency: 'EUR', merchant: 'Duolingo Plus', description: 'Подписка' },
    { id: 'fx_eur_6', timestamp: '2026-03-31T11:00:00+05:00', direction: 'out', amountForeign: 120, currency: 'EUR', merchant: 'Zara EU', description: 'Одежда онлайн' },
    { id: 'fx_eur_7', timestamp: '2026-03-29T14:20:00+05:00', direction: 'in', amountForeign: 500, currency: 'EUR', merchant: 'Revolut', description: 'Возврат со вклада' },
    { id: 'fx_eur_8', timestamp: '2026-03-26T09:45:00+05:00', direction: 'out', amountForeign: 89, currency: 'EUR', merchant: 'Airline', description: 'Доп. багаж' },
    { id: 'fx_eur_9', timestamp: '2026-03-23T18:30:00+05:00', direction: 'out', amountForeign: 45.50, currency: 'EUR', merchant: 'Amazon DE', description: 'Книги' },
  ],
}

export const NON_EXPENSE_KINDS = [
  'transfer_internal',
  'transfer_family',
  'goal_topup',
  'transfer_p2p',
  'transfer_external_card',
  'deposit_topup',
  'currency_purchase',
  'investment_contribution',
]

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
  /** Разное: мелкие магазины, нестандартный MCC */
  5399: 'other',
  5999: 'other',
  7299: 'other',
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
    description: 'Продукты',
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
    description: 'Поездка на такси',
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
    description: 'Продукты',
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
    description: 'Ужин',
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
    description: 'Одежда',
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
    description: 'Покупка в игре',
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
    description: 'Товары для дома',
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
    description: 'Товары для здоровья',
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
    description: 'Продукты',
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
    description: 'Поездка на такси',
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
    description: 'Ужин',
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
    description: 'Семейные покупки продуктов',
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
    description: 'Поездка на такси',
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
    description: 'Обслуживание авто',
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
    description: 'Продукты к школе',
    baseAmountUzs: 110000,
    seed: 15,
  },
  {
    day: 1,
    hour: 10,
    minute: 0,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Hududgaztaminot',
    category: 'utilities',
    mcc: 4899,
    description: 'Оплата за газ',
    baseAmountUzs: 185000,
    seed: 16,
  },
  {
    day: 2,
    hour: 10,
    minute: 30,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Toshkenelectr',
    category: 'utilities',
    mcc: 4899,
    description: 'Оплата за электричество',
    baseAmountUzs: 230000,
    seed: 17,
  },
  {
    day: 1,
    hour: 11,
    minute: 0,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Beeline UZ',
    category: 'subscriptions',
    mcc: 4899,
    description: 'Мобильная связь',
    baseAmountUzs: 65000,
    seed: 18,
  },
  {
    day: 1,
    hour: 11,
    minute: 15,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Uztelecom',
    category: 'subscriptions',
    mcc: 4899,
    description: 'Домашний интернет',
    baseAmountUzs: 95000,
    seed: 19,
  },
  {
    day: 2,
    hour: 14,
    minute: 0,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Toshsuvoqova',
    category: 'utilities',
    mcc: 4899,
    description: 'Оплата за воду',
    baseAmountUzs: 42000,
    seed: 20,
  },
  {
    day: 7,
    hour: 12,
    minute: 45,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Havas',
    category: 'groceries',
    mcc: 5411,
    description: 'Продукты в супермаркете',
    baseAmountUzs: 520000,
    seed: 21,
  },
  {
    day: 9,
    hour: 19,
    minute: 30,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Evos',
    category: 'restaurants',
    mcc: 5812,
    description: 'Фастфуд',
    baseAmountUzs: 125000,
    seed: 22,
  },
  {
    day: 5,
    hour: 17,
    minute: 0,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'English First',
    category: 'education',
    mcc: 5816,
    description: 'Курсы английского',
    baseAmountUzs: 850000,
    seed: 23,
  },
  {
    day: 12,
    hour: 14,
    minute: 30,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'H&M',
    category: 'clothes',
    mcc: 5651,
    description: 'Одежда',
    baseAmountUzs: 480000,
    seed: 24,
  },
  {
    day: 15,
    hour: 11,
    minute: 20,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Makro',
    category: 'groceries',
    mcc: 5411,
    description: 'Закупка продуктов',
    baseAmountUzs: 410000,
    seed: 25,
  },
  {
    day: 14,
    hour: 8,
    minute: 50,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Yandex Taxi',
    category: 'transport',
    mcc: 4121,
    description: 'Поездка на такси',
    baseAmountUzs: 78000,
    seed: 26,
  },
  {
    day: 17,
    hour: 20,
    minute: 0,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Il Gusto',
    category: 'restaurants',
    mcc: 5812,
    description: 'Итальянский ресторан',
    baseAmountUzs: 310000,
    seed: 27,
  },
  {
    day: 19,
    hour: 16,
    minute: 45,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Dori Darmon',
    category: 'health',
    mcc: 5912,
    description: 'Аптека',
    baseAmountUzs: 145000,
    seed: 28,
  },
  {
    day: 4,
    hour: 15,
    minute: 30,
    userId: 'user_3',
    accountId: 'acc_uzum_timur',
    merchant: 'Kitob Olami',
    category: 'education',
    mcc: 5816,
    description: 'Учебники и канцтовары',
    baseAmountUzs: 165000,
    seed: 29,
  },
  {
    day: 12,
    hour: 13,
    minute: 0,
    userId: 'user_3',
    accountId: 'acc_uzum_timur',
    merchant: 'McDonald\'s',
    category: 'restaurants',
    mcc: 5812,
    description: 'Обед',
    baseAmountUzs: 85000,
    seed: 30,
  },
  {
    day: 21,
    hour: 15,
    minute: 10,
    userId: 'user_3',
    accountId: 'acc_uzum_timur',
    merchant: 'LC Waikiki',
    category: 'clothes',
    mcc: 5651,
    description: 'Одежда для школы',
    baseAmountUzs: 350000,
    seed: 31,
  },
  {
    day: 25,
    hour: 10,
    minute: 15,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'MedLine Clinic',
    category: 'health',
    mcc: 5912,
    description: 'Стоматология',
    baseAmountUzs: 950000,
    seed: 32,
    everyNMonths: 3,
  },
  {
    day: 19,
    hour: 10,
    minute: 0,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'GreenApple',
    category: 'groceries',
    mcc: 5411,
    description: 'Фрукты и овощи',
    baseAmountUzs: 280000,
    seed: 33,
  },
  {
    day: 23,
    hour: 12,
    minute: 0,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Baraka Market',
    category: 'groceries',
    mcc: 5411,
    description: 'Продукты для семьи',
    baseAmountUzs: 355000,
    seed: 34,
  },
  {
    day: 28,
    hour: 8,
    minute: 40,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'MyTaxi',
    category: 'transport',
    mcc: 4121,
    description: 'Поездка MyTaxi',
    baseAmountUzs: 82000,
    seed: 35,
  },
  {
    day: 20,
    hour: 14,
    minute: 0,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'SPA Beauty Center',
    category: 'health',
    mcc: 5912,
    description: 'СПА-процедуры',
    baseAmountUzs: 420000,
    seed: 36,
    everyNMonths: 2,
  },
  {
    day: 15,
    hour: 20,
    minute: 30,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'The Plov',
    category: 'restaurants',
    mcc: 5812,
    description: 'Семейный ужин',
    baseAmountUzs: 340000,
    seed: 37,
  },
  {
    day: 7,
    hour: 16,
    minute: 0,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Uzum Market',
    category: 'shopping',
    mcc: 5311,
    description: 'Онлайн-заказ товаров',
    baseAmountUzs: 290000,
    seed: 38,
  },
  {
    day: 25,
    hour: 19,
    minute: 0,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Technodom',
    category: 'shopping',
    mcc: 5311,
    description: 'Электроника и техника',
    baseAmountUzs: 680000,
    seed: 39,
    everyNMonths: 3,
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
    description: 'Еженедельные продукты',
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
    description: 'Поездки по городу',
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
    description: 'Кофе в кафе',
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
    description: 'Заказ на маркетплейсе',
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
    description: 'Развлечения на выходных',
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
    description: 'Пополнение в игре',
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
    description: 'Покупки в аптеке',
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
    description: 'Заправка',
    baseAmountUzs: 220000,
    seed: 47,
  },
  {
    startDay: 1,
    hour: 8,
    minute: 15,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Yandex Taxi',
    mcc: 4121,
    fallbackCategory: 'transport',
    description: 'Поездка по делам',
    baseAmountUzs: 55000,
    seed: 48,
  },
  {
    startDay: 3,
    hour: 11,
    minute: 0,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Korzinka Express',
    mcc: 5411,
    fallbackCategory: 'groceries',
    description: 'Продукты (быстрые покупки)',
    baseAmountUzs: 185000,
    seed: 49,
  },
  {
    startDay: 5,
    hour: 12,
    minute: 30,
    userId: 'user_3',
    accountId: 'acc_uzum_timur',
    merchant: 'Школьная столовая',
    mcc: 5814,
    fallbackCategory: 'restaurants',
    description: 'Обеды в школе',
    baseAmountUzs: 35000,
    seed: 50,
  },
  {
    startDay: 1,
    hour: 9,
    minute: 45,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Starbucks',
    mcc: 5814,
    fallbackCategory: 'restaurants',
    description: 'Утренний кофе',
    baseAmountUzs: 52000,
    seed: 51,
  },
  {
    startDay: 6,
    hour: 10,
    minute: 0,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Dori Darmon',
    mcc: 5912,
    fallbackCategory: 'health',
    description: 'Аптека (еженедельно)',
    baseAmountUzs: 48000,
    seed: 52,
  },
  {
    startDay: 8,
    hour: 17,
    minute: 30,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Havas Express',
    mcc: 5411,
    fallbackCategory: 'groceries',
    description: 'Продукты по дороге домой',
    baseAmountUzs: 175000,
    seed: 53,
  },
  {
    startDay: 10,
    hour: 20,
    minute: 0,
    userId: 'user_1',
    accountId: 'acc_tbc_main',
    merchant: 'Delivery Club',
    mcc: 5812,
    fallbackCategory: 'restaurants',
    description: 'Доставка еды',
    baseAmountUzs: 135000,
    seed: 54,
  },
  {
    startDay: 4,
    hour: 16,
    minute: 0,
    userId: 'user_3',
    accountId: 'acc_uzum_timur',
    merchant: 'Korzinka',
    mcc: 5411,
    fallbackCategory: 'groceries',
    description: 'Перекус после школы',
    baseAmountUzs: 28000,
    seed: 55,
  },
  {
    startDay: 7,
    hour: 14,
    minute: 30,
    userId: 'user_2',
    accountId: 'acc_kapital_malika',
    merchant: 'Wildberries UZ',
    mcc: 5311,
    fallbackCategory: 'shopping',
    description: 'Заказ на маркетплейсе',
    baseAmountUzs: 220000,
    seed: 56,
  },
]

const MONTHLY_SALARY_UZS = 20_000_000
const MICROLOAN_ANNUAL_RATE = 0.24
const MAIN_SPENDING_ACCOUNT_ID = 'acc_tbc_main'
const EXTRA_SPENDING_PRESSURE_PERIOD_MONTHS = 2

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

function addMonths(year, month, deltaMonths) {
  const total = year * 12 + (month - 1) + deltaMonths
  return {
    year: Math.floor(total / 12),
    month: (total % 12) + 1,
  }
}

/** Дата ближайшей зарплаты (10-е число 09:35) после момента займа. */
function nextSalaryRepaymentTimestampAfter(timestamp) {
  const borrowedAt = new Date(timestamp)
  const year = borrowedAt.getFullYear()
  const month = borrowedAt.getMonth() + 1
  const thisMonthSalaryTs = toTimestamp(year, month, 10, 9, 35)
  if (timestamp < thisMonthSalaryTs) {
    return thisMonthSalaryTs
  }
  const next = addMonths(year, month, 1)
  return toTimestamp(next.year, next.month, 10, 9, 35)
}

function diffDaysCeil(fromTimestamp, toTimestampValue) {
  const from = new Date(fromTimestamp).getTime()
  const to = new Date(toTimestampValue).getTime()
  const rawDays = (to - from) / (24 * 60 * 60 * 1000)
  return Math.max(1, Math.ceil(rawDays))
}

function buildYearTransactions() {
  let txIndex = 1

  const nextTxId = () => {
    const txId = `tx_${String(txIndex).padStart(4, '0')}`
    txIndex += 1
    return txId
  }

  const transactions = []
  let cycleSpendableUzs = MONTHLY_SALARY_UZS
  /** Активные микрозаймы, которые погашаются в ближайшую зарплату (10-е число). */
  let pendingMicroloans = []

  const applyMicroloanFlow = (monthTransactions, monthCode) => {
    const ordered = [...monthTransactions].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    const withMicroloans = []

    ordered.forEach((transaction) => {
      if (transaction.accountId === MAIN_SPENDING_ACCOUNT_ID) {
        const amountUzs = Number(transaction.amountUzs) || 0

        const isMicroloanRepaymentPlaceholder =
          transaction.kind === 'purchase' &&
          transaction.direction === 'out' &&
          transaction.category === 'microloan' &&
          transaction.amountUzs === 0
        if (isMicroloanRepaymentPlaceholder) {
          const dueLoans = pendingMicroloans.filter((loan) => loan.repaymentAt <= transaction.timestamp)
          if (dueLoans.length > 0) {
            const totalPrincipalUzs = dueLoans.reduce((sum, loan) => sum + loan.principalUzs, 0)
            const totalInterestUzs = dueLoans.reduce((sum, loan) => {
              const daysInUse = diffDaysCeil(loan.borrowedAt, transaction.timestamp)
              return sum + (loan.principalUzs * MICROLOAN_ANNUAL_RATE * daysInUse) / 365
            }, 0)
            const repaymentAmountUzs = Math.round((totalPrincipalUzs + totalInterestUzs) * 10) / 10
            const totalDays = dueLoans.reduce(
              (sum, loan) => sum + diffDaysCeil(loan.borrowedAt, transaction.timestamp),
              0
            )
            const avgDays = Math.round(totalDays / dueLoans.length)

            withMicroloans.push({
              ...transaction,
              amountUzs: repaymentAmountUzs,
              description: `Погашение микрозайма ${monthCode}: тело ${Math.round(totalPrincipalUzs).toLocaleString('ru-RU')} + проценты ${Math.round(totalInterestUzs * 10) / 10} (24% годовых, ~${avgDays} дн.)`,
            })
            cycleSpendableUzs -= repaymentAmountUzs
            pendingMicroloans = pendingMicroloans.filter((loan) => loan.repaymentAt > transaction.timestamp)
          }
          return
        }

        if (transaction.direction === 'out') {
          const outAmountUzs = Math.abs(amountUzs)
          if (cycleSpendableUzs < outAmountUzs) {
            const deficitUzs = outAmountUzs - cycleSpendableUzs
            const microloanAmountUzs = Math.round(deficitUzs * 10) / 10
            const repaymentAt = nextSalaryRepaymentTimestampAfter(transaction.timestamp)
            withMicroloans.push({
              id: nextTxId(),
              timestamp: transaction.timestamp,
              userId: 'user_1',
              accountId: MAIN_SPENDING_ACCOUNT_ID,
              kind: 'income',
              direction: 'in',
              mcc: null,
              amountUzs: microloanAmountUzs,
              merchant: 'Microfinance 24%',
              category: 'microloan',
              description: `Получение микрозайма (${monthCode}) на ${Math.round(microloanAmountUzs).toLocaleString('ru-RU')} до ${repaymentAt.slice(0, 10)}`,
            })
            cycleSpendableUzs += microloanAmountUzs
            pendingMicroloans.push({
              principalUzs: microloanAmountUzs,
              borrowedAt: transaction.timestamp,
              repaymentAt,
            })
          }
          cycleSpendableUzs -= outAmountUzs
        } else if (transaction.direction === 'in') {
          const inAmountUzs = Math.abs(amountUzs)
          const isSalaryTopup =
            transaction.kind === 'income' && String(transaction.description || '').startsWith('Зарплата ')
          // Новый зарплатный цикл: считаем, что доступный лимит на месяц снова 20 млн (+ редкие доп. поступления в течение цикла).
          cycleSpendableUzs = isSalaryTopup ? inAmountUzs : cycleSpendableUzs + inAmountUzs
        }
      }

      withMicroloans.push(transaction)
    })

    return withMicroloans
  }

  YEAR_MONTHS.forEach(({ year, month }, monthIndex) => {
    const monthCode = `${year}-${pad2(month)}`
    const monthStartIndex = transactions.length
    const salaryAmountUzs = MONTHLY_SALARY_UZS
    const familyTransferAmountUzs = amountWithVariation(1450000, monthIndex, 91, 1050000)
    const depositTopupAmountUzs = amountWithVariation(820000, monthIndex, 95, 500000)
    /** Снятие со вклада всегда меньше пополнения; одна пара операций каждый месяц. */
    const depositWithdrawalRaw = amountWithVariation(640000, monthIndex, 96, 350000)
    const depositWithdrawalAmountUzs = Math.min(
      depositWithdrawalRaw,
      Math.max(350000, depositTopupAmountUzs - 100_000),
      depositTopupAmountUzs - 1000,
    )
    const goalTopupAmountUzs = amountWithVariation(1900000, monthIndex, 92, 1200000)
    const p2pTransferAmountUzs = amountWithVariation(950000, monthIndex, 97, 400000)
    /** Отдельное пополнение вклада (категория «Вклад»), помимо внутренних переводов между счетами. */
    const termDepositExtraUzs = amountWithVariation(420000, monthIndex, 98, 150000)
    const currencyBuyUzs = amountWithVariation(1280000, monthIndex, 99, 450000)
    const investmentContributionUzs = amountWithVariation(680000, monthIndex, 100, 200000)
    const externalCardTransferUzs = amountWithVariation(580000, monthIndex, 101, 180000)
    const otherStreetVendorUzs = amountWithVariation(52000, monthIndex, 102, 8000)
    const otherCornerShopUzs = amountWithVariation(89000, monthIndex, 103, 15000)
    const otherUnclearMccUzs = amountWithVariation(118000, monthIndex, 104, 25000)
    const largePlannedSpendUzs = amountWithVariation(11500000, monthIndex, 108, 9800000)
    const netflixAmountUzs = amountWithVariation(45000, monthIndex, 93, 30000)
    const aiSubAmountUzs = amountWithVariation(25000, monthIndex, 94, 15000)

    transactions.push({
      id: nextTxId(),
      timestamp: toTimestamp(year, month, 10, 9, 35),
      userId: 'user_1',
      accountId: MAIN_SPENDING_ACCOUNT_ID,
      kind: 'purchase',
      direction: 'out',
      mcc: null,
      amountUzs: 0,
      merchant: 'Microfinance 24%',
      category: 'microloan',
      description: `Погашение микрозайма ${monthCode}`,
    })

    transactions.push(
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 10, 9, 5),
        userId: 'user_1',
        accountId: 'acc_nbu_salary',
        kind: 'transfer_external_card',
        direction: 'in',
        mcc: null,
        amountUzs: salaryAmountUzs,
        merchant: 'TechnoSoft LLC',
        category: 'internal',
        description: `Поступление на Премиум Mastercard ${monthCode}`,
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 10, 9, 25),
        userId: 'user_1',
        accountId: 'acc_nbu_salary',
        kind: 'transfer_internal',
        direction: 'out',
        mcc: null,
        amountUzs: salaryAmountUzs,
        merchant: PRIMARY_BANK_RECREATE,
        category: 'internal',
        description: 'Перевод зарплаты на карту BANK OF RECREATE',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 10, 9, 26),
        userId: 'user_1',
        accountId: MAIN_SPENDING_ACCOUNT_ID,
        kind: 'income',
        direction: 'in',
        mcc: null,
        amountUzs: salaryAmountUzs,
        merchant: PRIMARY_BANK_RECREATE,
        category: 'income',
        description: `Зарплата ${monthCode} (помечено как зарплата, не как перевод)`,
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
        description: 'Семейный перевод',
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
        merchant: 'Алишер',
        category: 'family',
        description: 'Семейный перевод',
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
        merchant: 'Вклад 12%',
        category: 'deposit_account_fill',
        description: 'Пополнение вклада с основной карты',
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
        merchant: 'Вклад 12%',
        category: 'internal',
        description: 'Пополнение с основной карты',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 23, 18, 30),
        userId: 'user_1',
        accountId: 'acc_tbc_deposit',
        kind: 'transfer_internal',
        direction: 'out',
        mcc: null,
        amountUzs: depositWithdrawalAmountUzs,
        merchant: 'Вклад 12%',
        category: 'internal',
        description: 'Вывод на основную карту',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 23, 18, 31),
        userId: 'user_1',
        accountId: MAIN_SPENDING_ACCOUNT_ID,
        kind: 'transfer_internal',
        direction: 'in',
        mcc: null,
        amountUzs: depositWithdrawalAmountUzs,
        merchant: 'Вклад 12%',
        category: 'deposit_account_payout',
        description: 'Зачисление с вклада',
      },
    )

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
        description: 'Ежемесячная подписка',
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
        description: 'Подписка на сервис ИИ',
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
        merchant: 'Вклад 12%',
        category: 'internal',
        description: 'Пополнение накопительной цели',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 16, 15, 20),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'transfer_p2p',
        direction: 'out',
        mcc: null,
        amountUzs: p2pTransferAmountUzs,
        merchant: 'Перевод',
        category: 'transfer',
        description: 'На карту другому человеку',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 7, 11, 5),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'deposit_topup',
        direction: 'out',
        mcc: null,
        amountUzs: termDepositExtraUzs,
        merchant: 'Вклад 12%',
        category: 'deposit',
        description: 'Дополнительное пополнение вклада',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 9, 14, 40),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'currency_purchase',
        direction: 'out',
        mcc: null,
        amountUzs: currencyBuyUzs,
        merchant: 'Обменный пункт',
        category: 'currency_purchase',
        description: 'Покупка валюты (USD)',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 11, 10, 25),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'investment_contribution',
        direction: 'out',
        mcc: null,
        amountUzs: investmentContributionUzs,
        merchant: 'Capital Markets',
        category: 'investments',
        description: 'Пополнение инвестсчёта',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 18, 17, 50),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'transfer_external_card',
        direction: 'out',
        mcc: null,
        amountUzs: externalCardTransferUzs,
        merchant: 'Перевод на карту',
        category: 'transfer_external',
        description: (() => {
          const targets = [
            'Золотая HUMO (привязанная)',
            'Капитал основная (привязанная)',
            'Виза для путешествий (привязанная)',
            'Премиум Mastercard (привязанная)',
          ]
          return `На карту вне семейных счетов: ${targets[monthIndex % targets.length]}`
        })(),
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 13, 19, 12),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'purchase',
        direction: 'out',
        mcc: null,
        amountUzs: otherStreetVendorUzs,
        merchant: 'Уличный продавец',
        category: 'other',
        description: 'Оплата наличными на карту / терминал без MCC',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 15, 12, 33),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'purchase',
        direction: 'out',
        mcc: 5399,
        amountUzs: otherCornerShopUzs,
        merchant: 'Магазин у дома',
        category: resolveCategoryByMcc(5399, 'other'),
        description: 'Мелкая покупка, нестандартный код',
      },
      {
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 22, 8, 18),
        userId: 'user_1',
        accountId: 'acc_tbc_main',
        kind: 'purchase',
        direction: 'out',
        mcc: 5999,
        amountUzs: otherUnclearMccUzs,
        merchant: 'Точка ОП',
        category: resolveCategoryByMcc(5999, 'other'),
        description: 'Разное (неоднозначный MCC)',
      },
    )

    if (monthIndex % EXTRA_SPENDING_PRESSURE_PERIOD_MONTHS === 0) {
      transactions.push({
        id: nextTxId(),
        timestamp: toTimestamp(year, month, 23, 20, 45),
        userId: 'user_1',
        accountId: MAIN_SPENDING_ACCOUNT_ID,
        kind: 'purchase',
        direction: 'out',
        mcc: 5311,
        amountUzs: largePlannedSpendUzs,
        merchant: 'Крупные семейные покупки',
        category: resolveCategoryByMcc(5311, 'shopping'),
        description: 'Плановые крупные расходы месяца',
      })
    }

    const monthTransactions = transactions.splice(monthStartIndex)
    transactions.push(...applyMicroloanFlow(monthTransactions, monthCode))
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

/** Движения по привязанным картам (отдельный учёт от счетов в моках). */
export const STANDALONE_CARD_MOVEMENTS = {
  ext_card_1: [
    { id: 'scm_h0', timestamp: '2026-04-10T09:13:00+05:00', direction: 'in', amountUzs: 20000000, merchant: 'Премиум Mastercard', description: 'Зарплата (помечено вручную, не как перевод)' },
    { id: 'scm_h1', timestamp: '2026-04-10T19:40:00+05:00', direction: 'out', amountUzs: 285000, merchant: 'Korzinka', description: 'Продукты' },
    { id: 'scm_h2', timestamp: '2026-04-09T08:15:00+05:00', direction: 'out', amountUzs: 72000, merchant: 'Yandex Taxi', description: 'Поездка' },
    { id: 'scm_h3', timestamp: '2026-04-08T21:05:00+05:00', direction: 'in', amountUzs: 500000, merchant: 'Входящий перевод', description: 'От физлица' },
    { id: 'scm_h4', timestamp: '2026-04-07T14:22:00+05:00', direction: 'out', amountUzs: 198000, merchant: 'Plov Centre', description: 'Обед' },
    { id: 'scm_h5', timestamp: '2026-04-06T11:00:00+05:00', direction: 'out', amountUzs: 45000, merchant: 'Coffee Spot', description: 'Кофе' },
    { id: 'scm_h6', timestamp: '2026-04-05T09:30:00+05:00', direction: 'in', amountUzs: 1200000, merchant: 'Зачисление', description: 'Возврат' },
    { id: 'scm_h7', timestamp: '2026-04-04T18:15:00+05:00', direction: 'out', amountUzs: 420000, merchant: 'Havas', description: 'Продукты' },
    { id: 'scm_h8', timestamp: '2026-04-03T09:00:00+05:00', direction: 'out', amountUzs: 65000, merchant: 'Beeline UZ', description: 'Мобильная связь' },
    { id: 'scm_h9', timestamp: '2026-04-02T13:40:00+05:00', direction: 'out', amountUzs: 155000, merchant: 'Evos', description: 'Обед доставка' },
    { id: 'scm_h10', timestamp: '2026-04-01T10:00:00+05:00', direction: 'out', amountUzs: 185000, merchant: 'Hududgaztaminot', description: 'Газ за март' },
    { id: 'scm_h11', timestamp: '2026-03-31T20:30:00+05:00', direction: 'out', amountUzs: 230000, merchant: 'Toshkenelectr', description: 'Электричество' },
    { id: 'scm_h12', timestamp: '2026-03-30T15:10:00+05:00', direction: 'out', amountUzs: 310000, merchant: 'Uzum Market', description: 'Бытовая техника' },
    { id: 'scm_h13', timestamp: '2026-03-29T11:25:00+05:00', direction: 'out', amountUzs: 88000, merchant: 'MyTaxi', description: 'Поездка' },
    { id: 'scm_h14', timestamp: '2026-03-28T19:00:00+05:00', direction: 'out', amountUzs: 270000, merchant: 'The Plov', description: 'Семейный ужин' },
    { id: 'scm_h15', timestamp: '2026-03-27T08:45:00+05:00', direction: 'out', amountUzs: 52000, merchant: 'Starbucks', description: 'Кофе' },
    { id: 'scm_h16', timestamp: '2026-03-26T14:30:00+05:00', direction: 'out', amountUzs: 380000, merchant: 'Korzinka', description: 'Продукты на неделю' },
    { id: 'scm_h17', timestamp: '2026-03-25T10:15:00+05:00', direction: 'in', amountUzs: 20000000, merchant: 'Премиум Mastercard', description: 'Зарплата март' },
    { id: 'scm_h18', timestamp: '2026-03-24T16:50:00+05:00', direction: 'out', amountUzs: 145000, merchant: 'Delivery Club', description: 'Доставка еды' },
    { id: 'scm_h19', timestamp: '2026-03-22T12:00:00+05:00', direction: 'out', amountUzs: 220000, merchant: 'Fuel Station', description: 'Заправка' },
    { id: 'scm_h20', timestamp: '2026-03-20T09:30:00+05:00', direction: 'out', amountUzs: 95000, merchant: 'Netflix', description: 'Подписка' },
  ],
  ext_card_2: [
    { id: 'scm_k1', timestamp: '2026-04-10T16:10:00+05:00', direction: 'out', amountUzs: 412000, merchant: 'Makro', description: 'Покупки' },
    { id: 'scm_k2', timestamp: '2026-04-09T12:45:00+05:00', direction: 'out', amountUzs: 89000, merchant: 'АЗС', description: 'Топливо' },
    { id: 'scm_k3', timestamp: '2026-04-08T18:20:00+05:00', direction: 'in', amountUzs: 350000, merchant: 'Перевод', description: 'С другой карты' },
    { id: 'scm_k4', timestamp: '2026-04-07T10:05:00+05:00', direction: 'out', amountUzs: 156000, merchant: 'Pharmacy 24', description: 'Аптека' },
    { id: 'scm_k5', timestamp: '2026-04-06T20:15:00+05:00', direction: 'out', amountUzs: 220000, merchant: 'Cinema Tickets', description: 'Кино' },
    { id: 'scm_k6', timestamp: '2026-04-04T15:00:00+05:00', direction: 'in', amountUzs: 800000, merchant: 'Зарплатный проект', description: 'Выплата' },
    { id: 'scm_k7', timestamp: '2026-04-03T11:30:00+05:00', direction: 'out', amountUzs: 195000, merchant: 'Korzinka', description: 'Продукты' },
    { id: 'scm_k8', timestamp: '2026-04-02T08:20:00+05:00', direction: 'out', amountUzs: 68000, merchant: 'Yandex Taxi', description: 'Поездка' },
    { id: 'scm_k9', timestamp: '2026-04-01T14:00:00+05:00', direction: 'out', amountUzs: 280000, merchant: 'H&M', description: 'Одежда' },
    { id: 'scm_k10', timestamp: '2026-03-31T10:45:00+05:00', direction: 'out', amountUzs: 175000, merchant: 'Evos', description: 'Обед' },
    { id: 'scm_k11', timestamp: '2026-03-30T16:30:00+05:00', direction: 'out', amountUzs: 320000, merchant: 'Wildberries UZ', description: 'Заказ' },
    { id: 'scm_k12', timestamp: '2026-03-28T19:10:00+05:00', direction: 'in', amountUzs: 800000, merchant: 'Зарплатный проект', description: 'Выплата' },
    { id: 'scm_k13', timestamp: '2026-03-27T12:15:00+05:00', direction: 'out', amountUzs: 92000, merchant: 'Dori Darmon', description: 'Аптека' },
    { id: 'scm_k14', timestamp: '2026-03-25T09:00:00+05:00', direction: 'out', amountUzs: 445000, merchant: 'Makro', description: 'Закупка' },
    { id: 'scm_k15', timestamp: '2026-03-23T20:30:00+05:00', direction: 'out', amountUzs: 185000, merchant: 'Il Gusto', description: 'Ресторан' },
  ],
  ext_card_visa: [
    { id: 'scm_v1', timestamp: '2026-04-10T11:20:00+05:00', direction: 'out', amountUzs: 125400.5, merchant: 'Booking.com', description: 'Отель' },
    { id: 'scm_v2', timestamp: '2026-04-09T09:05:00+05:00', direction: 'out', amountUzs: 67800.25, merchant: 'Starbucks', description: 'Кофе' },
    { id: 'scm_v3', timestamp: '2026-04-08T16:40:00+05:00', direction: 'in', amountUzs: 250000, merchant: 'Trastbank', description: 'Возврат по чарджбэку' },
    { id: 'scm_v4', timestamp: '2026-04-07T13:15:00+05:00', direction: 'out', amountUzs: 990000, merchant: 'Airline', description: 'Билеты' },
    { id: 'scm_v5', timestamp: '2026-04-05T10:30:00+05:00', direction: 'out', amountUzs: 185000, merchant: 'Amazon', description: 'Онлайн-заказ' },
    { id: 'scm_v6', timestamp: '2026-04-03T15:00:00+05:00', direction: 'out', amountUzs: 42000, merchant: 'Netflix', description: 'Подписка' },
    { id: 'scm_v7', timestamp: '2026-04-01T11:45:00+05:00', direction: 'in', amountUzs: 500000, merchant: 'Trastbank', description: 'Зачисление' },
    { id: 'scm_v8', timestamp: '2026-03-30T18:20:00+05:00', direction: 'out', amountUzs: 1350000, merchant: 'Uzbekistan Airways', description: 'Авиабилет Ташкент-Стамбул' },
    { id: 'scm_v9', timestamp: '2026-03-28T09:00:00+05:00', direction: 'out', amountUzs: 78500, merchant: 'Spotify', description: 'Подписка' },
    { id: 'scm_v10', timestamp: '2026-03-25T14:15:00+05:00', direction: 'out', amountUzs: 210000, merchant: 'Booking.com', description: 'Бронь отеля' },
  ],
  ext_card_mc: [
    { id: 'scm_m0', timestamp: '2026-04-10T09:05:00+05:00', direction: 'in', amountUzs: 20000000, merchant: 'TechnoSoft LLC', description: 'Зачисление зарплаты' },
    { id: 'scm_m0b', timestamp: '2026-04-10T09:12:00+05:00', direction: 'out', amountUzs: 20000000, merchant: 'BANK OF RECREATE BY WIZBORT', description: 'Перевод на Золотую HUMO (учтено как зарплата)' },
    { id: 'scm_m1', timestamp: '2026-04-10T20:00:00+05:00', direction: 'out', amountUzs: 310200.8, merchant: 'Technodom', description: 'Электроника' },
    { id: 'scm_m2', timestamp: '2026-04-09T07:50:00+05:00', direction: 'out', amountUzs: 45000, merchant: 'АЗС Tenge', description: 'Топливо' },
    { id: 'scm_m3', timestamp: '2026-04-08T12:30:00+05:00', direction: 'in', amountUzs: 500000.33, merchant: 'Перевод', description: 'От контрагента' },
    { id: 'scm_m4', timestamp: '2026-04-06T18:45:00+05:00', direction: 'out', amountUzs: 178900.12, merchant: 'Ресторан', description: 'Ужин' },
    { id: 'scm_m5', timestamp: '2026-04-05T10:00:00+05:00', direction: 'out', amountUzs: 92000, merchant: 'Yandex Taxi', description: 'Поездка в аэропорт' },
    { id: 'scm_m6', timestamp: '2026-04-04T14:30:00+05:00', direction: 'out', amountUzs: 450000, merchant: 'Uzum Market', description: 'Электроника' },
    { id: 'scm_m7', timestamp: '2026-04-03T11:20:00+05:00', direction: 'out', amountUzs: 65000, merchant: 'Starbucks', description: 'Кофе и десерт' },
    { id: 'scm_m8', timestamp: '2026-04-02T16:00:00+05:00', direction: 'out', amountUzs: 340000, merchant: 'Korzinka', description: 'Продукты' },
    { id: 'scm_m9', timestamp: '2026-04-01T09:45:00+05:00', direction: 'out', amountUzs: 115000, merchant: 'Fuel Station', description: 'Заправка' },
    { id: 'scm_m10', timestamp: '2026-03-31T19:30:00+05:00', direction: 'out', amountUzs: 290000, merchant: 'Sushi Wok', description: 'Ужин' },
    { id: 'scm_m11', timestamp: '2026-03-30T08:00:00+05:00', direction: 'in', amountUzs: 20000000, merchant: 'TechnoSoft LLC', description: 'Зарплата март' },
    { id: 'scm_m12', timestamp: '2026-03-28T13:15:00+05:00', direction: 'out', amountUzs: 520000, merchant: 'Technodom', description: 'Аксессуары' },
    { id: 'scm_m13', timestamp: '2026-03-26T17:40:00+05:00', direction: 'out', amountUzs: 155000, merchant: 'MyTaxi', description: 'Поездки за день' },
  ],
}

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
  card_balance: { label: 'Остаток на карте', emoji: '💳', color: '#4cd6fb' },
  groceries: { label: 'Продукты', emoji: '🛒', color: '#22c55e' },
  transport: { label: 'Транспорт', emoji: '🚕', color: '#3b82f6' },
  restaurants: { label: 'Рестораны', emoji: '🍽️', color: '#f97316' },
  subscriptions: { label: 'Подписки', emoji: '📱', color: '#a855f7' },
  entertainment: { label: 'Развлечения', emoji: '🎬', color: '#ec4899' },
  clothes: { label: 'Одежда', emoji: '👗', color: '#14b8a6' },
  shopping: { label: 'Покупки', emoji: '🛍️', color: '#8b5cf6' },
  health: { label: 'Здоровье', emoji: '💊', color: '#ef4444' },
  utilities: { label: 'Коммунальные', emoji: '🏠', color: '#0ea5e9' },
  education: { label: 'Образование', emoji: '📚', color: '#6366f1' },
  car: { label: 'Авто', emoji: '🔧', color: '#64748b' },
  internal: { label: 'Внутренний перевод', emoji: '↔️', color: '#94a3b8' },
  family: { label: 'Семейный перевод', emoji: '👨‍👩‍👦', color: '#fbbf24' },
  /** P2P и переводы на привязанные карты других банков — в мониторинге суммируются в одну категорию. */
  transfer: { label: 'Переводы', emoji: '💸', color: '#38bdf8' },
  /** Та же смысловая группа, что и transfer; ключ сохранён для операций с category из API. */
  transfer_external: { label: 'Переводы', emoji: '💸', color: '#38bdf8' },
  deposit: { label: 'Вклад', emoji: '🏦', color: '#a78bfa' },
  /** Перевод на вклад со своей карты — в затратах как отдельная статья. */
  deposit_account_fill: { label: 'Пополнение вклада', emoji: '🏦', color: '#8b5cf6' },
  /** Возврат со вклада на карту — в поступлениях как дополнительный доход. */
  deposit_account_payout: { label: 'Снятие со вклада', emoji: '💵', color: '#34d399' },
  currency_purchase: { label: 'Покупка валюты', emoji: '💱', color: '#eab308' },
  investments: { label: 'Инвестиции', emoji: '📈', color: '#10b981' },
  goal_topup: { label: 'Накопительная цель', emoji: '🎯', color: '#f97316' },
  microloan: { label: 'Микрозайм', emoji: '🧾', color: '#fb7185' },
  other: { label: 'Другое', emoji: '⋯', color: '#78716c' },
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
