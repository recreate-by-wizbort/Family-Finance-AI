# 📋 Инструкция 2 — mockData.js (тестовые данные)
## ⏱ Время: ~30 минут | Порядок выполнения: ВТОРОЙ

---

## Цель
Создать реалистичные тестовые данные, которые имитируют ответ банковского API.
Структура данных должна быть такой, как будто она пришла с реального бэкенда — это важно для жюри.

---

## Полное содержимое `src/mockData.js`

```javascript
// mockData.js
// В production эти данные приходят из банковского API через REST/GraphQL
// Здесь используются статичные данные для демонстрации концепции на хакатоне

// ─── Члены семьи ───────────────────────────────────────────────────────────
export const FAMILY_MEMBERS = [
  { id: "user_1", name: "Алишер", role: "owner", avatar: "А", color: "#6c63ff" },
  { id: "user_2", name: "Малика",  role: "spouse", avatar: "М", color: "#ec4899" },
  { id: "user_3", name: "Тимур",   role: "child",  avatar: "Т", color: "#22c55e" },
];

// ─── Счета и карты ─────────────────────────────────────────────────────────
export const ACCOUNTS = [
  { id: "acc_1", userId: "user_1", bank: "TBC Uzbekistan", type: "debit",   currency: "UZS", balance: 4_850_000,  label: "Основная карта",    isOwn: true },
  { id: "acc_2", userId: "user_1", bank: "NBU",            type: "salary",  currency: "UZS", balance: 12_200_000, label: "Зарплатная карта",  isOwn: true },
  { id: "acc_3", userId: "user_1", bank: "TBC Uzbekistan", type: "deposit", currency: "UZS", balance: 8_500_000,  label: "Вклад 12%",         isOwn: true },
  { id: "acc_4", userId: "user_2", bank: "Kapital Bank",   type: "debit",   currency: "UZS", balance: 2_100_000,  label: "Карта Малики",      isOwn: true },
  { id: "acc_5", userId: "user_3", bank: "Uzum Bank",      type: "debit",   currency: "UZS", balance: 650_000,    label: "Карта Тимура",      isOwn: true },
];

// ─── Транзакции за текущий месяц ───────────────────────────────────────────
// Типы: purchase | transfer_internal | transfer_family | income | subscription
export const TRANSACTIONS = [
  // Зарплата
  { id: "tx_001", date: "2025-03-01", userId: "user_1", accountId: "acc_2", type: "income",            amount: 18_500_000, merchant: "ООО Компания",         category: "income",       description: "Зарплата март" },

  // Внутренний перевод (зарплатная → основная) — НЕ считается расходом
  { id: "tx_002", date: "2025-03-01", userId: "user_1", accountId: "acc_2", type: "transfer_internal", amount: -10_000_000, merchant: "Основная карта TBC",  category: "internal",     description: "Перевод себе" },
  { id: "tx_003", date: "2025-03-01", userId: "user_1", accountId: "acc_1", type: "transfer_internal", amount: 10_000_000,  merchant: "С зарплатной NBU",    category: "internal",     description: "Поступление" },

  // Перевод жене — НЕ считается расходом (семейное перераспределение)
  { id: "tx_004", date: "2025-03-02", userId: "user_1", accountId: "acc_1", type: "transfer_family",   amount: -1_500_000, merchant: "Малика (Kapital)",     category: "family",       description: "Жене на расходы" },
  { id: "tx_005", date: "2025-03-02", userId: "user_2", accountId: "acc_4", type: "transfer_family",   amount: 1_500_000,  merchant: "От Алишера",          category: "family",       description: "От мужа" },

  // Реальные расходы — считаются
  { id: "tx_006", date: "2025-03-03", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -485_000,   merchant: "Korzinka",             category: "groceries",    description: "Продукты" },
  { id: "tx_007", date: "2025-03-04", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -95_000,    merchant: "Yandex Taxi",          category: "transport",    description: "Такси" },
  { id: "tx_008", date: "2025-03-05", userId: "user_2", accountId: "acc_4", type: "purchase",          amount: -320_000,   merchant: "Makro",                category: "groceries",    description: "Продукты" },
  { id: "tx_009", date: "2025-03-06", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -180_000,   merchant: "Plov Centre",          category: "restaurants",  description: "Обед" },
  { id: "tx_010", date: "2025-03-07", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -75_000,    merchant: "Yandex Taxi",          category: "transport",    description: "Такси" },
  { id: "tx_011", date: "2025-03-08", userId: "user_2", accountId: "acc_4", type: "purchase",          amount: -890_000,   merchant: "Zara",                 category: "clothes",      description: "Одежда" },
  { id: "tx_012", date: "2025-03-09", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -550_000,   merchant: "Ашан",                 category: "groceries",    description: "Продукты" },
  { id: "tx_013", date: "2025-03-10", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -120_000,   merchant: "Yandex Taxi",          category: "transport",    description: "Такси" },
  { id: "tx_014", date: "2025-03-11", userId: "user_3", accountId: "acc_5", type: "purchase",          amount: -85_000,    merchant: "Steam",                category: "entertainment","description": "Игра" },
  { id: "tx_015", date: "2025-03-12", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -240_000,   merchant: "Baraka Market",        category: "groceries",    description: "Продукты" },
  { id: "tx_016", date: "2025-03-13", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -210_000,   merchant: "Tandir",               category: "restaurants",  description: "Ужин" },
  { id: "tx_017", date: "2025-03-14", userId: "user_2", accountId: "acc_4", type: "purchase",          amount: -45_000,    merchant: "Netflix",              category: "subscriptions","description": "Подписка" },
  { id: "tx_018", date: "2025-03-14", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -19_000,    merchant: "Spotify",              category: "subscriptions","description": "Подписка" },
  { id: "tx_019", date: "2025-03-14", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -25_000,    merchant: "ChatGPT Plus",         category: "subscriptions","description": "AI подписка" },
  { id: "tx_020", date: "2025-03-15", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -380_000,   merchant: "Korzinka",             category: "groceries",    description: "Продукты" },
  { id: "tx_021", date: "2025-03-16", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -95_000,    merchant: "Yandex Taxi",          category: "transport",    description: "Такси" },
  { id: "tx_022", date: "2025-03-17", userId: "user_2", accountId: "acc_4", type: "purchase",          amount: -450_000,   merchant: "Hilton Tashkent SPA",  category: "entertainment","description": "Спа-день" },
  { id: "tx_023", date: "2025-03-18", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -670_000,   merchant: "Uzum Market",          category: "shopping",     description: "Покупки" },
  { id: "tx_024", date: "2025-03-19", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -115_000,   merchant: "Yandex Taxi",          category: "transport",    description: "Такси" },
  { id: "tx_025", date: "2025-03-20", userId: "user_3", accountId: "acc_5", type: "purchase",          amount: -120_000,   merchant: "Korzinka",             category: "groceries",    description: "Продукты школа" },
  { id: "tx_026", date: "2025-03-21", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -280_000,   merchant: "Sushi Wok",            category: "restaurants",  description: "Ужин" },
  { id: "tx_027", date: "2025-03-22", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -290_000,   merchant: "Korzinka",             category: "groceries",    description: "Продукты" },
  { id: "tx_028", date: "2025-03-23", userId: "user_2", accountId: "acc_4", type: "purchase",          amount: -180_000,   merchant: "iHerb",                category: "health",       description: "Витамины" },
  { id: "tx_029", date: "2025-03-24", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -85_000,    merchant: "Yandex Taxi",          category: "transport",    description: "Такси" },
  { id: "tx_030", date: "2025-03-25", userId: "user_1", accountId: "acc_1", type: "purchase",          amount: -1_200_000, merchant: "Автосервис",           category: "car",          description: "ТО машины" },

  // Пополнение вклада — НЕ считается расходом
  { id: "tx_031", date: "2025-03-15", userId: "user_1", accountId: "acc_1", type: "transfer_internal", amount: -2_000_000, merchant: "Вклад 12% TBC",       category: "internal",     description: "Пополнение вклада" },
];

// ─── Прошлый месяц для сравнения ───────────────────────────────────────────
export const LAST_MONTH_STATS = {
  totalExpenses: 5_820_000,
  byCategory: {
    groceries:     1_820_000,
    transport:       380_000,
    restaurants:     520_000,
    subscriptions:    65_000,
    entertainment:   210_000,
    clothes:         480_000,
    shopping:        345_000,
    health:          120_000,
    car:             880_000,
  }
};

// ─── Финансовые цели ───────────────────────────────────────────────────────
export const GOALS = [
  {
    id: "goal_1",
    title: "Купить машину",
    emoji: "🚗",
    targetAmount: 80_000_000,
    savedAmount: 8_500_000,
    monthlyDeposit: 1_200_000,
    targetDate: "2026-09-01",
    color: "#6c63ff",
  },
  {
    id: "goal_2",
    title: "Отпуск в Стамбуле",
    emoji: "✈️",
    targetAmount: 8_000_000,
    savedAmount: 1_800_000,
    monthlyDeposit: 600_000,
    targetDate: "2025-07-01",
    color: "#22c55e",
  },
  {
    id: "goal_3",
    title: "Подушка безопасности",
    emoji: "🛡️",
    targetAmount: 30_000_000,
    savedAmount: 5_200_000,
    monthlyDeposit: 800_000,
    targetDate: "2027-01-01",
    color: "#f59e0b",
  },
];

// ─── Сюрприз-цель ──────────────────────────────────────────────────────────
export const SURPRISE_GOAL = {
  id: "surprise_1",
  title: "Подарок на 8 марта",
  emoji: "🎁",
  amount: 500_000,
  revealDate: "2025-03-08",
  isRevealed: true, // уже прошло — показываем как пример
  hiddenFromFamily: true,
};

// ─── Категории с иконками и цветами ───────────────────────────────────────
export const CATEGORIES = {
  groceries:     { label: "Продукты",      emoji: "🛒", color: "#22c55e" },
  transport:     { label: "Транспорт",     emoji: "🚕", color: "#3b82f6" },
  restaurants:   { label: "Кафе/Рестораны",emoji: "🍽️", color: "#f97316" },
  subscriptions: { label: "Подписки",      emoji: "📱", color: "#a855f7" },
  entertainment: { label: "Развлечения",   emoji: "🎬", color: "#ec4899" },
  clothes:       { label: "Одежда",        emoji: "👗", color: "#14b8a6" },
  shopping:      { label: "Покупки",       emoji: "🛍️", color: "#8b5cf6" },
  health:        { label: "Здоровье",      emoji: "💊", color: "#ef4444" },
  car:           { label: "Авто",          emoji: "🔧", color: "#64748b" },
  internal:      { label: "Внутр. перевод",emoji: "↔️", color: "#94a3b8" },
  family:        { label: "Семья",         emoji: "👨‍👩‍👦", color: "#fbbf24" },
  income:        { label: "Доход",         emoji: "💰", color: "#22c55e" },
};
```

---

## ✅ Что проверить после выполнения

Импортируй в `App.jsx` и выведи в консоль — должны быть все данные:

```javascript
import { TRANSACTIONS, GOALS, FAMILY_MEMBERS } from './mockData';
console.log('Транзакций:', TRANSACTIONS.length);       // 31
console.log('Целей:', GOALS.length);                    // 3
console.log('Членов семьи:', FAMILY_MEMBERS.length);    // 3
```

**Следующий шаг → Инструкция 3: utils.js**
