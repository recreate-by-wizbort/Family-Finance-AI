# 📋 Инструкция 3 — utils.js (логика расчётов)
## ⏱ Время: ~45 минут | Порядок выполнения: ТРЕТИЙ

---

## Цель
Написать все функции расчёта — фильтрацию переводов, аналитику по категориям,
прогнозы, расчёт целей. Это "мозг" продукта без бэкенда.

---

## Полное содержимое `src/utils.js`

```javascript
// utils.js — вся логика расчётов и фильтрации

import { TRANSACTIONS, ACCOUNTS, LAST_MONTH_STATS, CATEGORIES } from './mockData';

// ─── 1. УМНАЯ ФИЛЬТРАЦИЯ ПЕРЕВОДОВ ─────────────────────────────────────────
// Ключевая фича: отсеиваем внутренние переводы, считаем только реальные траты

/**
 * Возвращает только реальные расходы (без внутренних переводов и доходов)
 */
export function getRealExpenses(transactions = TRANSACTIONS) {
  return transactions.filter(tx =>
    tx.type === 'purchase' || tx.type === 'subscription'
  );
}

/**
 * Возвращает только семейные переводы (для отдельного отображения)
 */
export function getFamilyTransfers(transactions = TRANSACTIONS) {
  return transactions.filter(tx => tx.type === 'transfer_family' && tx.amount < 0);
}

/**
 * Возвращает только внутренние переводы пользователя
 */
export function getInternalTransfers(transactions = TRANSACTIONS) {
  return transactions.filter(tx =>
    tx.type === 'transfer_internal' && tx.amount < 0
  );
}

// ─── 2. АНАЛИТИКА ПО КАТЕГОРИЯМ ────────────────────────────────────────────

/**
 * Группирует реальные расходы по категориям
 * Возвращает: { groceries: 1500000, transport: 400000, ... }
 */
export function getExpensesByCategory(transactions = TRANSACTIONS) {
  const realExpenses = getRealExpenses(transactions);
  return realExpenses.reduce((acc, tx) => {
    const cat = tx.category || 'other';
    acc[cat] = (acc[cat] || 0) + Math.abs(tx.amount);
    return acc;
  }, {});
}

/**
 * Группирует расходы по члену семьи
 * Возвращает: { user_1: 3200000, user_2: 1800000, ... }
 */
export function getExpensesByMember(transactions = TRANSACTIONS) {
  const realExpenses = getRealExpenses(transactions);
  return realExpenses.reduce((acc, tx) => {
    acc[tx.userId] = (acc[tx.userId] || 0) + Math.abs(tx.amount);
    return acc;
  }, {});
}

/**
 * Общая сумма реальных расходов
 */
export function getTotalExpenses(transactions = TRANSACTIONS) {
  return getRealExpenses(transactions).reduce(
    (sum, tx) => sum + Math.abs(tx.amount), 0
  );
}

// ─── 3. СРАВНЕНИЕ С ПРОШЛЫМ МЕСЯЦЕМ ────────────────────────────────────────

/**
 * Считает процент изменения расходов относительно прошлого месяца
 * Возвращает: { total: 23, byCategory: { groceries: 15, transport: 28, ... } }
 */
export function getMonthOverMonthChange(transactions = TRANSACTIONS) {
  const thisMonth = getExpensesByCategory(transactions);
  const lastMonth = LAST_MONTH_STATS.byCategory;
  const totalThis = getTotalExpenses(transactions);
  const totalLast = LAST_MONTH_STATS.totalExpenses;

  const byCategory = {};
  const allCategories = new Set([
    ...Object.keys(thisMonth),
    ...Object.keys(lastMonth),
  ]);

  allCategories.forEach(cat => {
    const curr = thisMonth[cat] || 0;
    const prev = lastMonth[cat] || 0;
    if (prev > 0) {
      byCategory[cat] = Math.round(((curr - prev) / prev) * 100);
    } else if (curr > 0) {
      byCategory[cat] = 100; // новая категория
    }
  });

  return {
    total: Math.round(((totalThis - totalLast) / totalLast) * 100),
    byCategory,
  };
}

/**
 * Возвращает топ-3 категории с наибольшим ростом расходов
 */
export function getTopAnomalies(transactions = TRANSACTIONS) {
  const changes = getMonthOverMonthChange(transactions);
  return Object.entries(changes.byCategory)
    .filter(([, pct]) => pct > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat, pct]) => ({
      category: cat,
      label: CATEGORIES[cat]?.label || cat,
      emoji: CATEGORIES[cat]?.emoji || '📊',
      changePercent: pct,
    }));
}

// ─── 4. ПРОГНОЗ БЮДЖЕТА ─────────────────────────────────────────────────────

/**
 * Считает прогноз расходов до конца месяца
 * Возвращает: { spent: 7200000, projected: 9800000, daysLeft: 6, dailyAvg: 280000 }
 */
export function getBudgetForecast(transactions = TRANSACTIONS) {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  const spent = getTotalExpenses(transactions);
  const dailyAvg = dayOfMonth > 0 ? spent / dayOfMonth : 0;
  const projected = Math.round(spent + dailyAvg * daysLeft);

  return { spent, projected, daysLeft, dailyAvg: Math.round(dailyAvg) };
}

/**
 * Считает общий баланс по всем счетам семьи (без вкладов для "живых" денег)
 */
export function getTotalBalance(accounts = ACCOUNTS) {
  return accounts
    .filter(acc => acc.type !== 'deposit')
    .reduce((sum, acc) => sum + acc.balance, 0);
}

/**
 * Считает баланс конкретного члена семьи
 */
export function getMemberBalance(userId, accounts = ACCOUNTS) {
  return accounts
    .filter(acc => acc.userId === userId && acc.type !== 'deposit')
    .reduce((sum, acc) => sum + acc.balance, 0);
}

// ─── 5. РАСЧЁТ ЦЕЛЕЙ ────────────────────────────────────────────────────────

/**
 * Рассчитывает прогресс и прогноз для одной цели
 */
export function calculateGoalProgress(goal) {
  const { targetAmount, savedAmount, monthlyDeposit, targetDate } = goal;
  const progress = Math.round((savedAmount / targetAmount) * 100);
  const remaining = targetAmount - savedAmount;

  const today = new Date();
  const target = new Date(targetDate);
  const monthsLeft = Math.max(
    0,
    (target.getFullYear() - today.getFullYear()) * 12 +
    (target.getMonth() - today.getMonth())
  );

  const projectedSaved = savedAmount + monthlyDeposit * monthsLeft;
  const willReach = projectedSaved >= targetAmount;
  const monthsNeeded = monthlyDeposit > 0
    ? Math.ceil(remaining / monthlyDeposit)
    : null;

  return {
    progress,
    remaining,
    monthsLeft,
    willReach,
    monthsNeeded,
    projectedSaved,
  };
}

/**
 * Считает оптимальный месячный взнос для достижения цели вовремя
 */
export function calcRequiredMonthlyDeposit(goal) {
  const { targetAmount, savedAmount, targetDate } = goal;
  const today = new Date();
  const target = new Date(targetDate);
  const months = Math.max(1,
    (target.getFullYear() - today.getFullYear()) * 12 +
    (target.getMonth() - today.getMonth())
  );
  return Math.ceil((targetAmount - savedAmount) / months);
}

// ─── 6. ФОРМАТИРОВАНИЕ ──────────────────────────────────────────────────────

/**
 * Форматирует число как валюту UZS
 * formatMoney(1500000) → "1 500 000 сум"
 */
export function formatMoney(amount) {
  return new Intl.NumberFormat('ru-RU').format(Math.round(amount)) + ' сум';
}

/**
 * Форматирует число компактно
 * formatMoneyShort(1500000) → "1.5 млн"
 */
export function formatMoneyShort(amount) {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + ' млрд';
  if (amount >= 1_000_000)     return (amount / 1_000_000).toFixed(1) + ' млн';
  if (amount >= 1_000)         return (amount / 1_000).toFixed(0) + ' тыс';
  return amount.toString();
}

/**
 * Возвращает цвет для процентного изменения
 */
export function getChangeColor(pct) {
  if (pct > 10)  return 'var(--danger)';
  if (pct > 0)   return 'var(--warning)';
  return 'var(--success)';
}

/**
 * Возвращает CSS-класс тега для изменения
 */
export function getChangeTagClass(pct) {
  if (pct > 10)  return 'tag-danger';
  if (pct > 0)   return 'tag-warning';
  return 'tag-success';
}

// ─── 7. ДАННЫЕ ДЛЯ ГРАФИКА ──────────────────────────────────────────────────

/**
 * Подготавливает данные для recharts — расходы по категориям
 */
export function getCategoryChartData(transactions = TRANSACTIONS) {
  const byCategory = getExpensesByCategory(transactions);
  const lastMonth  = LAST_MONTH_STATS.byCategory;

  return Object.entries(byCategory)
    .map(([cat, amount]) => ({
      name:  CATEGORIES[cat]?.label || cat,
      emoji: CATEGORIES[cat]?.emoji || '📊',
      color: CATEGORIES[cat]?.color || '#6c63ff',
      current:  Math.round(amount / 1000),     // в тысячах для графика
      previous: Math.round((lastMonth[cat] || 0) / 1000),
    }))
    .sort((a, b) => b.current - a.current);
}

/**
 * Подготавливает данные для пирог-чарта по категориям
 */
export function getPieChartData(transactions = TRANSACTIONS) {
  const byCategory = getExpensesByCategory(transactions);
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);

  return Object.entries(byCategory)
    .map(([cat, amount]) => ({
      name:    CATEGORIES[cat]?.label || cat,
      value:   Math.round(amount / 1000),
      color:   CATEGORIES[cat]?.color || '#6c63ff',
      percent: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

// ─── 8. КОНТЕКСТ ДЛЯ AI ─────────────────────────────────────────────────────

/**
 * Готовит текстовый контекст для передачи в AI (без персональных данных!)
 * Только цифры и категории — имена не передаём в AI
 */
export function buildAIContext(transactions = TRANSACTIONS) {
  const totalExpenses = getTotalExpenses(transactions);
  const byCategory    = getExpensesByCategory(transactions);
  const changes       = getMonthOverMonthChange(transactions);
  const forecast      = getBudgetForecast(transactions);
  const totalBalance  = getTotalBalance();

  const categoryLines = Object.entries(byCategory)
    .map(([cat, amt]) => {
      const pct = changes.byCategory[cat];
      const sign = pct > 0 ? `+${pct}%` : `${pct}%`;
      return `- ${CATEGORIES[cat]?.label || cat}: ${formatMoneyShort(amt)} (${sign} к пред. месяцу)`;
    })
    .join('\n');

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

Семья из 3 человек: взрослый (основной), супруга, ребёнок.
Внутренние переводы между членами семьи и вкладами исключены из расчёта.
  `.trim();
}
```

---

## ✅ Быстрая проверка

Добавь в `App.jsx` и запусти:

```javascript
import { getTotalExpenses, getMonthOverMonthChange, getTopAnomalies } from './utils';

console.log('Расходы:', getTotalExpenses());
console.log('Изменения:', getMonthOverMonthChange());
console.log('Аномалии:', getTopAnomalies());
```

Должно вывести расходы ~7 млн сум и показать рост в такси и кафе.

---

**Следующий шаг → Инструкция 4: api.js (OpenRouter)**
