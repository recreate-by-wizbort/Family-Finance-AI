import { TRANSACTIONS, FAMILY_MEMBERS, NON_EXPENSE_KINDS } from './mockData'

export const USER_PROFILE = { name: 'Андрей', userId: 'user_1' }

const CATEGORY_LABELS = {
  groceries: 'Продукты',
  restaurants: 'Кафе и рестораны',
  transport: 'Транспорт',
  clothes: 'Одежда',
  entertainment: 'Развлечения',
  shopping: 'Маркетплейсы',
  health: 'Здоровье',
  car: 'Авто',
  education: 'Образование',
  utilities: 'Коммунальные',
  subscriptions: 'Подписки',
  microloan: 'Микрозайм',
  other: 'Другое',
  internal: 'Внутренние переводы',
  family: 'Семейные переводы',
  transfer: 'Переводы',
  currency_purchase: 'Покупка валюты',
  deposit_account_fill: 'Пополнение вклада',
  savings: 'Накопления',
  goal_topup: 'Пополнение цели',
  deposit_topup: 'Пополнение вклада',
  investment_contribution: 'Инвестиции',
  transfer_p2p: 'Перевод P2P',
  transfer_external_card: 'Перевод на карту',
}

function fmt(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.0', '')} млн сум`
  return `${Math.round(v / 1000)} тыс. сум`
}

function pct(cur, prev) {
  if (!prev) return cur > 0 ? '+100%' : '0%'
  const d = ((cur - prev) / prev) * 100
  return `${d > 0 ? '+' : ''}${Math.round(d)}%`
}

const HOUSEHOLD_TRANSFER_KINDS = new Set(['transfer_internal', 'transfer_family'])

function isHouseholdTransfer(tx) {
  return tx.direction === 'out' && HOUSEHOLD_TRANSFER_KINDS.has(tx.kind) && tx.category !== 'deposit_account_fill'
}

function filterTx(range, opts = {}) {
  return TRANSACTIONS.filter((tx) => {
    const t = new Date(tx.timestamp).getTime()
    if (t < range.start.getTime() || t > range.end.getTime()) return false
    if (opts.direction && tx.direction !== opts.direction) return false
    if (opts.category && tx.category !== opts.category) return false
    if (opts.userId && tx.userId !== opts.userId) return false
    if (opts.direction === 'out' && isHouseholdTransfer(tx)) return false
    return true
  })
}

function filterRealExpenses(range, opts = {}) {
  const uid = opts.userId || null
  return TRANSACTIONS.filter((tx) => {
    const t = new Date(tx.timestamp).getTime()
    if (t < range.start.getTime() || t > range.end.getTime()) return false
    if (tx.direction !== 'out') return false
    if (NON_EXPENSE_KINDS.includes(tx.kind)) return false
    if (opts.category && tx.category !== opts.category) return false
    if (uid && tx.userId !== uid) return false
    return true
  })
}

const NON_INCOME_KINDS = new Set([
  'transfer_internal', 'transfer_family', 'deposit_topup',
  'goal_topup', 'transfer_p2p', 'transfer_external_card',
])

function filterRealIncome(range, opts = {}) {
  return TRANSACTIONS.filter((tx) => {
    const t = new Date(tx.timestamp).getTime()
    if (t < range.start.getTime() || t > range.end.getTime()) return false
    if (tx.direction !== 'in') return false
    if (NON_INCOME_KINDS.has(tx.kind)) return false
    if (opts.userId && tx.userId !== opts.userId) return false
    return true
  })
}

function realIncome(range, opts) {
  return sumTx(filterRealIncome(range, opts))
}

function realExpenses(range, opts) {
  return sumTx(filterRealExpenses(range, opts))
}

function sumTx(txList) {
  return txList.reduce((s, tx) => s + Number(tx.amountUzs || 0), 0)
}

function prevRange(range) {
  const durationMs = range.end.getTime() - range.start.getTime()
  return {
    start: new Date(range.start.getTime() - durationMs - 1),
    end: new Date(range.start.getTime() - 1),
  }
}

function categoryBreakdown(range, direction = 'out') {
  const txs = direction === 'out' ? filterRealExpenses(range) : filterTx(range, { direction })
  const map = new Map()
  for (const tx of txs) {
    const cat = tx.category || 'other'
    map.set(cat, (map.get(cat) || 0) + Number(tx.amountUzs || 0))
  }
  return [...map.entries()]
    .map(([cat, amount]) => ({ cat, label: CATEGORY_LABELS[cat] || cat, amount }))
    .sort((a, b) => b.amount - a.amount)
}

function topMerchants(range, category, limit = 5) {
  const txs = filterTx(range, { direction: 'out', category })
  const map = new Map()
  for (const tx of txs) {
    const key = tx.merchant || tx.description || 'Без названия'
    const entry = map.get(key) || { amount: 0, count: 0 }
    entry.amount += Number(tx.amountUzs || 0)
    entry.count += 1
    map.set(key, entry)
  }
  return [...map.entries()]
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

function memberBreakdown(range) {
  const txs = filterTx(range, { direction: 'out' })
  const map = new Map()
  for (const tx of txs) {
    map.set(tx.userId, (map.get(tx.userId) || 0) + Number(tx.amountUzs || 0))
  }
  const total = sumTx(txs) || 1
  return [...map.entries()].map(([uid, amount]) => {
    const member = FAMILY_MEMBERS.find((m) => m.id === uid)
    return { userId: uid, name: member?.name || uid, amount, share: Math.round((amount / total) * 100) }
  }).sort((a, b) => b.amount - a.amount)
}

// ────────────────────────────────────────────────────────────────────────────────
// Dynamic response generators keyed by category tree path
// ────────────────────────────────────────────────────────────────────────────────

let _activeScope = 'personal'

function scoped() {
  return _activeScope === 'family' ? {} : { userId: USER_PROFILE.userId }
}

function inc(range, extra = {}) {
  return realIncome(range, { ...scoped(), ...extra })
}

function exp(range, extra = {}) {
  return realExpenses(range, { ...scoped(), ...extra })
}

function brkdown(range) {
  const txs = filterRealExpenses(range, scoped())
  const map = new Map()
  for (const tx of txs) {
    const cat = tx.category || 'other'
    map.set(cat, (map.get(cat) || 0) + Number(tx.amountUzs || 0))
  }
  return [...map.entries()]
    .map(([cat, amount]) => ({ cat, label: CATEGORY_LABELS[cat] || cat, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function generateDynamicResponse(goalId, range, scope) {
  const gen = GENERATORS[goalId]
  if (!gen) return null
  _activeScope = scope || 'personal'
  try {
    return gen(range, scope)
  } catch {
    return null
  }
}

const GENERATORS = {
  // ── Expenses: Food ───────────────────────────────────────────────────────────
  food_why(range) {
    const cur = exp(range, { category: 'groceries' }) + exp(range, { category: 'restaurants' })
    const prev = prevRange(range)
    const prevSum = realExpenses(prev, { ...scoped(), category: 'groceries' }) + realExpenses(prev, { ...scoped(), category: 'restaurants' })
    const groc = exp(range, { category: 'groceries' })
    const rest = exp(range, { category: 'restaurants' })
    const restCount = filterRealExpenses(range, { ...scoped(), category: 'restaurants' }).length
    return `За выбранный период расходы на еду и кафе: ${fmt(cur)} (${pct(cur, prevSum)} к предыдущему периоду).\n\nПродукты: ${fmt(groc)}, кафе/рестораны: ${fmt(rest)} (${restCount} визитов).\n\n${cur > prevSum ? 'Основной рост — кафе и рестораны. Рекомендую установить лимит.' : 'Расходы в норме или снизились — хорошая динамика.'}`
  },

  food_save(range) {
    const rest = filterTx(range, { direction: 'out', category: 'restaurants' })
    const restSum = sumTx(rest)
    const avgCheck = rest.length ? Math.round(restSum / rest.length) : 0
    const merchants = topMerchants(range, 'restaurants', 3)
    const topList = merchants.map((m) => `• ${m.name}: ${fmt(m.amount)} (${m.count} раз)`).join('\n')
    return `Средний чек в кафе: ${fmt(avgCheck)}. Всего визитов: ${rest.length}.\n\nТоп заведений:\n${topList}\n\nСовет: сократив визиты в кафе на 30%, вы сэкономите ~${fmt(Math.round(restSum * 0.3))}.`
  },

  food_compare(range) {
    const prev = prevRange(range)
    const cats = ['groceries', 'restaurants']
    const lines = cats.map((cat) => {
      const cur = exp(range, { category: cat })
      const pr = realExpenses(prev, { ...scoped(), category: cat })
      return `${CATEGORY_LABELS[cat]}: ${fmt(cur)} (${pct(cur, pr)})`
    })
    const totalCur = cats.reduce((s, c) => s + exp(range, { category: c }), 0)
    const totalPrev = cats.reduce((s, c) => s + realExpenses(prev, { ...scoped(), category: c }), 0)
    return `Сравнение с предыдущим периодом:\n${lines.join('\n')}\n\nОбщий итог по еде: ${fmt(totalCur)} (${pct(totalCur, totalPrev)}).`
  },

  // ── Expenses: Transport ──────────────────────────────────────────────────────
  tr_why(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'transport' })
    const sum = sumTx(txs)
    const prev = prevRange(range)
    const prevSum = realExpenses(prev, { ...scoped(), category: 'transport' })
    const avg = txs.length ? Math.round(sum / txs.length) : 0
    return `Транспорт за период: ${fmt(sum)} (${pct(sum, prevSum)}).\n\nВсего поездок: ${txs.length}, средний чек: ${fmt(avg)}.\n\n${sum > prevSum ? 'Рост расходов — стоит обратить внимание.' : 'Расходы стабильны или снизились.'}`
  },

  tr_save(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'transport' })
    const sum = sumTx(txs)
    const merchants = topMerchants(range, 'transport', 3)
    const topList = merchants.map((m) => `• ${m.name}: ${fmt(m.amount)} (${m.count} поездок)`).join('\n')
    return `Транспортные расходы за период: ${fmt(sum)}.\n\n${topList}\n\nСовет: замена части поездок на метро/автобус может сэкономить ~${fmt(Math.round(sum * 0.4))}.`
  },

  // ── Expenses: Subscriptions ──────────────────────────────────────────────────
  sub_list(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'subscriptions' })
    if (!txs.length) return 'За выбранный период расходов на подписки не обнаружено.'
    const merchants = topMerchants(range, 'subscriptions', 10)
    const list = merchants.map((m) => `• ${m.name}: ${fmt(m.amount)}`).join('\n')
    return `Подписки за период:\n${list}\n\nИтого: ${fmt(sumTx(txs))}.`
  },

  sub_cut(range) {
    const merchants = topMerchants(range, 'subscriptions', 10)
    if (!merchants.length) return 'Активных подписок за период не обнаружено.'
    const smallest = merchants[merchants.length - 1]
    return `Наименее используемая подписка: ${smallest.name} (${fmt(smallest.amount)}).\n\nОтключив её, вы сэкономите ${fmt(smallest.amount)} за аналогичный период.`
  },

  // ── Expenses: Utilities ──────────────────────────────────────────────────────
  ut_overview(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'utilities' })
    if (!txs.length) return 'За выбранный период коммунальных платежей не обнаружено.'
    const sum = sumTx(txs)
    const merchants = topMerchants(range, 'utilities', 5)
    const list = merchants.map((m) => `• ${m.name}: ${fmt(m.amount)}`).join('\n')
    return `Коммунальные платежи: ${fmt(sum)}.\n\n${list}`
  },

  ut_save(range) {
    const cur = exp(range, { category: 'utilities' })
    const prev = prevRange(range)
    const prevSum = realExpenses(prev, { ...scoped(), category: 'utilities' })
    return `Коммунальные: ${fmt(cur)} (${pct(cur, prevSum)} к прошлому периоду).\n\n${cur > prevSum ? 'Рост сезонный. Проверьте тариф интернета — возможно, есть выгоднее.' : 'Расходы стабильны.'}`
  },

  // ── Expenses: Marketplace ────────────────────────────────────────────────────
  mp_total(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'shopping' })
    const sum = sumTx(txs)
    const prev = prevRange(range)
    const prevSum = realExpenses(prev, { ...scoped(), category: 'shopping' })
    return `Маркетплейсы за период: ${fmt(sum)} (${txs.length} покупок, ${pct(sum, prevSum)}).\n\nСредний чек: ${fmt(txs.length ? Math.round(sum / txs.length) : 0)}.\n\n${sum > prevSum ? 'Тенденция к росту — установите лимит.' : 'Расходы в норме.'}`
  },

  mp_save(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'shopping' })
    const sum = sumTx(txs)
    return `Маркетплейсы: ${fmt(sum)} за ${txs.length} покупок.\n\nСоветы:\n• Удалите сохранённые карты из приложений\n• Применяйте правило 24 часов для покупок > 100 тыс.\n• Потенциал экономии: ~${fmt(Math.round(sum * 0.3))}.`
  },

  // ── Expenses: Health ─────────────────────────────────────────────────────────
  h_overview(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'health' })
    const sum = sumTx(txs)
    const income = inc(range)
    const ratio = income ? Math.round((sum / income) * 100) : 0
    return `Здоровье за период: ${fmt(sum)} (${ratio}% от дохода).\n\nРекомендуемый резерв на медицину: 5-10% от дохода (~${fmt(Math.round(income * 0.07))}).`
  },

  // ── Expenses: Entertainment ──────────────────────────────────────────────────
  ent_overview(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'entertainment' })
    const sum = sumTx(txs)
    const income = inc(range)
    const merchants = topMerchants(range, 'entertainment', 3)
    const list = merchants.map((m) => `• ${m.name}: ${fmt(m.amount)} (${m.count} раз)`).join('\n')
    return `Развлечения за период: ${fmt(sum)} (${income ? Math.round((sum / income) * 100) : '?'}% от дохода).\n\n${list}\n\nОптимально: не более 30% дохода на все «желания».`
  },

  // ── Expenses: Clothing ───────────────────────────────────────────────────────
  cl_overview(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'clothes' })
    const sum = sumTx(txs)
    const prev = prevRange(range)
    const prevSum = realExpenses(prev, { ...scoped(), category: 'clothes' })
    return `Одежда за период: ${fmt(sum)} (${pct(sum, prevSum)}).\n\nСовет: планируйте крупные покупки заранее, избегайте импульсного шоппинга.`
  },

  // ── Expenses: Education ──────────────────────────────────────────────────────
  edu_overview(range) {
    const sum = exp(range, { category: 'education' })
    if (!sum) return 'За выбранный период расходов на образование не обнаружено.'
    return `Образование за период: ${fmt(sum)}.\n\nЭти платежи учтены как регулярные в прогнозе бюджета.`
  },

  // ── Income ───────────────────────────────────────────────────────────────────
  sal_analysis(range) {
    const txs = filterRealIncome(range, scoped())
    const sum = sumTx(txs)
    const salaryTxs = txs.filter((tx) => (tx.description || '').toLowerCase().includes('зарплат') || (tx.merchant || '').toLowerCase().includes('salary'))
    const salarySum = sumTx(salaryTxs)
    return `Реальные поступления за период (без внутренних переводов): ${fmt(sum)}.\n\n${salaryTxs.length ? `Зарплата: ${fmt(salarySum)} (${salaryTxs.length} поступлений).` : 'Зарплатных поступлений не определено — AI определяет их по регулярным крупным входящим.'}`
  },

  pas_overview(range) {
    const txs = filterRealIncome(range, scoped())
    const sum = sumTx(txs)
    return `Реальные поступления за период (без переводов между счетами): ${fmt(sum)}.\n\nДля увеличения пассивного дохода рассмотрите вклад с капитализацией.`
  },

  // ── Goals ────────────────────────────────────────────────────────────────────
  car_prog(range) {
    const expenses = exp(range)
    const income = inc(range)
    const free = income - expenses
    return `За период: доход ${fmt(income)}, расходы ${fmt(expenses)}, свободный остаток ${fmt(Math.max(0, free))}.\n\nЕсли направить свободный остаток на цель «Машина», это ускорит накопление.`
  },

  car_fast(range) {
    const expenses = exp(range)
    const income = inc(range)
    const free = Math.max(0, income - expenses)
    const breakdown = brkdown(range)
    const optimizable = breakdown.filter((c) => ['restaurants', 'entertainment', 'shopping'].includes(c.cat))
    const potentialSaving = optimizable.reduce((s, c) => s + Math.round(c.amount * 0.3), 0)
    const lines = optimizable.map((c) => `• ${c.label}: потратили ${fmt(c.amount)}, если тратить на 30% меньше — экономия ~${fmt(Math.round(c.amount * 0.3))}`).join('\n')
    return `Свободный остаток: ${fmt(free)}.\n\nЕсли начать тратить на 30% меньше в кафе, развлечениях и маркетплейсах, можно дополнительно сэкономить ~${fmt(potentialSaving)}:\n${lines}\n\nИтого на цель «Машина» можно направить: ~${fmt(free + potentialSaving)}.`
  },

  vac_prog(range) {
    const income = inc(range)
    const expenses = exp(range)
    return `Доход: ${fmt(income)}, расходы: ${fmt(expenses)}.\n\nСвободный остаток ${fmt(Math.max(0, income - expenses))} можно направить на цель «Отпуск».`
  },

  vac_fast(range) {
    const breakdown = brkdown(range)
    const optimizable = breakdown.filter((c) => ['restaurants', 'entertainment', 'shopping', 'clothes'].includes(c.cat))
    if (!optimizable.length) return 'За выбранный период нет подходящих категорий для ускорения накопления на отпуск.'
    const saving = optimizable.reduce((s, c) => s + Math.round(c.amount * 0.25), 0)
    const lines = optimizable
      .map((c) => `• ${c.label}: потратили ${fmt(c.amount)}. Если тратить на 25% меньше, экономия составит ~${fmt(Math.round(c.amount * 0.25))}`)
      .join('\n')
    return `Как быстрее накопить на отпуск

Если в этих категориях начать тратить на 25% меньше:

${lines}

Итого дополнительно на отпуск: ~${fmt(saving)}.`
  },

  saf_prog(range) {
    const income = inc(range)
    const expenses = exp(range)
    return `За период: доход ${fmt(income)}, расходы ${fmt(expenses)}.\n\nРекомендуемая подушка: 3-6 мес. расходов (${fmt(expenses * 3)} – ${fmt(expenses * 6)}).`
  },

  saf_advice(range) {
    const expenses = exp(range)
    return `При расходах ${fmt(expenses)} за период, идеальная подушка: ${fmt(expenses * 3)} – ${fmt(expenses * 6)}.\n\nПосле закрытия текущей цели стоит увеличить подушку.`
  },

  house_plan(range) {
    const income = inc(range)
    const expenses = exp(range)
    const free = Math.max(0, income - expenses)
    return `Свободный остаток за период: ${fmt(free)}.\n\nДля первоначального взноса на жильё начните откладывать ${fmt(Math.round(free * 0.5))} ежемесячно.`
  },

  // ── Forecast ─────────────────────────────────────────────────────────────────
  end_enough(range) {
    const income = inc(range)
    const expenses = exp(range)
    const daysInPeriod = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86400000))
    const dailyRate = expenses / daysInPeriod
    const remaining = income - expenses
    return `Расходы за период: ${fmt(expenses)} (~${fmt(Math.round(dailyRate))}/день, ${daysInPeriod} дней).\n\nОстаток: ${fmt(Math.max(0, remaining))}.\n\n${remaining > 0 ? 'Бюджет в норме.' : 'Внимание: расходы превысили доходы!'}`
  },

  end_save(range) {
    const income = inc(range)
    const expenses = exp(range)
    const free = Math.max(0, income - expenses)
    const toSave = Math.round(free * 0.6)
    const buffer = free - toSave
    return `Свободный остаток: ${fmt(free)}.\n\nРекомендация: ${fmt(toSave)} на цели, ${fmt(buffer)} буфер.`
  },

  next_pred(range) {
    const expenses = exp(range)
    const predicted = Math.round(expenses * 1.05)
    return `Расходы за текущий период: ${fmt(expenses)}.\n\nПрогноз на следующий (+5% сезонность): ~${fmt(predicted)}.`
  },

  next_plan(range) {
    const breakdown = brkdown(range)
    const lines = breakdown.slice(0, 6).map((c) => `• ${c.label}: ${fmt(c.amount)}`).join('\n')
    const total = breakdown.reduce((s, c) => s + c.amount, 0)
    return `Рекомендуемый бюджет (на основе текущих расходов ${fmt(total)}):\n${lines}\n\nПлюс резерв: ~${fmt(Math.round(total * 0.1))}.`
  },

  // ── Optimize ─────────────────────────────────────────────────────────────────
  opt_tips(range) {
    const breakdown = brkdown(range)
    const targets = breakdown.filter((c) => ['restaurants', 'entertainment', 'shopping', 'transport', 'clothes'].includes(c.cat))
    if (!targets.length) return 'За выбранный период нет гибких категорий для оценки экономии.'
    const lines = targets
      .map((c) => `• ${c.label}: вы потратили ${fmt(c.amount)}. Если тратить на 25% меньше, экономия составит ~${fmt(Math.round(c.amount * 0.25))}`)
      .join('\n')
    const totalSaving = targets.reduce((s, c) => s + Math.round(c.amount * 0.25), 0)
    return `Где можно сэкономить за период

Ниже — категории, в которых можно попробовать тратить меньше. Мы посчитали: если сократить траты в каждой из них на 25%, сколько денег высвободится.

${lines}

Итого можно сэкономить: ~${fmt(totalSaving)} и направить эти деньги на цели.

Как тратить меньше на практике:
• Маркетплейсы — не заказывайте сразу, подождите 24 часа. Составляйте список заранее.
• Кафе — установите лимит на месяц или чаще готовьте дома.
• Транспорт — замените часть поездок на такси общественным транспортом.
• Одежда и развлечения — выделите фиксированную сумму на месяц и не превышайте её.`
  },

  auto_tips(range) {
    const breakdown = brkdown(range)
    const recurring = breakdown.filter((c) => ['utilities', 'subscriptions'].includes(c.cat))
    const lines = recurring.map((c) => `• ${c.label}: ${fmt(c.amount)} → автоплатёж`).join('\n')
    return `Можно автоматизировать:\n${lines || '• Коммунальные → автоплатёж\n• Накопления → автоперевод в день зарплаты'}\n\nПлюс: округление покупок с переводом разницы на цель.`
  },

  cmp_detail(range) {
    const prev = prevRange(range)
    const curBreak = brkdown(range)
    const prevBreak = brkdown(prev)
    const prevMap = new Map(prevBreak.map((c) => [c.cat, c.amount]))
    const lines = curBreak.slice(0, 6).map((c) => {
      const pr = prevMap.get(c.cat) || 0
      return `• ${c.label}: ${fmt(c.amount)} (${pct(c.amount, pr)})`
    }).join('\n')
    const curTotal = curBreak.reduce((s, c) => s + c.amount, 0)
    const prevTotal = prevBreak.reduce((s, c) => s + c.amount, 0)
    return `Сравнение периодов:\n${lines}\n\nОбщие расходы: ${fmt(curTotal)} (${pct(curTotal, prevTotal)}).`
  },

  // ── Family ───────────────────────────────────────────────────────────────────
  fw_break(range) {
    const members = memberBreakdown(range)
    const lines = members.map((m) => `• ${m.name}: ${fmt(m.amount)} (${m.share}%)`).join('\n')
    const prev = prevRange(range)
    const prevMembers = memberBreakdown(prev)
    const growthLines = members.map((m) => {
      const pr = prevMembers.find((p) => p.userId === m.userId)
      return pr ? `${m.name}: ${pct(m.amount, pr.amount)}` : null
    }).filter(Boolean).join(', ')
    return `Расходы по членам семьи:\n${lines}\n\nДинамика: ${growthLines || 'нет данных за прошлый период'}.`
  },

  fw_anom(range) {
    const members = memberBreakdown(range)
    const prev = prevRange(range)
    const prevMembers = memberBreakdown(prev)
    const anomalies = members.map((m) => {
      const pr = prevMembers.find((p) => p.userId === m.userId)
      if (!pr || pr.amount === 0) return null
      const growth = (m.amount - pr.amount) / pr.amount
      if (growth > 0.3) return `${m.name}: расходы +${Math.round(growth * 100)}%`
      return null
    }).filter(Boolean)
    if (!anomalies.length) return 'За выбранный период аномалий в семейных расходах не обнаружено.'
    return `Аномалии в семейных расходах:\n• ${anomalies.join('\n• ')}`
  },

  ftr_over(range) {
    const allTxs = filterTx(range)
    const transfers = allTxs.filter((tx) => (tx.description || '').toLowerCase().includes('перевод') || tx.category === 'transfer')
    const sum = sumTx(transfers)
    return `Переводов за период: ${transfers.length}, на сумму ${fmt(sum)}.\n\nВнутрисемейные переводы исключены из расходов.`
  },

  ftr_opt(range) {
    const allTxs = filterTx(range)
    const transfers = allTxs.filter((tx) => (tx.description || '').toLowerCase().includes('перевод') || tx.category === 'transfer')
    return `Переводов: ${transfers.length}.\n\nСовет: объединить мелкие переводы в один автоматический в начале месяца.`
  },

  fg_prog(range) {
    const income = inc(range)
    const expenses = exp(range)
    const free = Math.max(0, income - expenses)
    return `Семейный свободный остаток за период: ${fmt(free)}.\n\nРекомендуемый вклад в семейные цели: ${fmt(Math.round(free * 0.3))}.`
  },

  fg_dist(range) {
    const members = memberBreakdown(range)
    const totalIncome = inc(range)
    const lines = members.map((m) => {
      const memberIncome = realIncome(range, { userId: m.userId })
      const share = totalIncome ? Math.round((memberIncome / totalIncome) * 100) : 0
      return `• ${m.name}: ${share}% (по доходу)`
    }).join('\n')
    return `Рекомендуемое распределение вкладов в цели:\n${lines}`
  },

  fs_create() {
    return 'Сюрприз — приватная копилка. Укажите сумму и дату раскрытия. В аналитике — «накопление» без деталей.'
  },

  fs_status() {
    return 'Для проверки статуса сюрприз-целей откройте раздел «Цели» → «Сюрприз».'
  },

  fbr_stat(range) {
    const income = inc(range)
    const expenses = exp(range)
    return `За период: доход ${fmt(income)}, расходы ${fmt(expenses)}.\n\nРекомендуемый резерв семьи: ${fmt(expenses * 3)} (3 мес. расходов).`
  },

  fbr_plan(range) {
    const expenses = exp(range)
    const target = expenses * 3
    return `Для резерва ${fmt(target)} (3 мес.) откладывайте ${fmt(Math.round(target / 6))} ежемесячно — цель за 6 месяцев.`
  },

  fbo_tips(range) {
    const breakdown = brkdown(range)
    const targets = breakdown.filter((c) => ['restaurants', 'entertainment', 'shopping', 'transport'].includes(c.cat))
    if (!targets.length) return 'За выбранный период нет подходящих категорий для оценки семейной экономии.'
    const lines = targets
      .map((c) => `• ${c.label}: семья потратила ${fmt(c.amount)}. Если тратить на 25% меньше, экономия составит ~${fmt(Math.round(c.amount * 0.25))}`)
      .join('\n')
    const totalSaving = targets.reduce((s, c) => s + Math.round(c.amount * 0.25), 0)
    return `Где семья может сэкономить

Если начать тратить на 25% меньше в этих категориях:

${lines}

Итого можно сэкономить: ~${fmt(totalSaving)} и направить на семейные цели.

Что обычно помогает семье: общий лимит на кафе/доставку, «потолок» на маркетплейсы на месяц, договориться о крупных покупках заранее.`
  },

  fbo_cmp(range) {
    return GENERATORS.cmp_detail(range)
  },

  fk_detail(range) {
    const childId = FAMILY_MEMBERS.find((m) => m.role === 'child')?.id
    if (!childId) return 'Участников с ролью «ребёнок» не найдено.'
    const txs = filterRealExpenses(range, { userId: childId })
    const sum = sumTx(txs)
    const cats = new Map()
    for (const tx of txs) {
      const c = tx.category || 'other'
      cats.set(c, (cats.get(c) || 0) + Number(tx.amountUzs || 0))
    }
    const lines = [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([c, a]) => `• ${CATEGORY_LABELS[c] || c}: ${fmt(a)}`).join('\n')
    const child = FAMILY_MEMBERS.find((m) => m.id === childId)
    return `Расходы ${child.name} за период: ${fmt(sum)}.\n\n${lines}`
  },

  fk_set() {
    return 'Для детей доступны: дневной лимит, лимит по категориям, уведомления о крупных покупках. Настройте в разделе «Семья».'
  },

  fk_edu_d(range) {
    const childId = FAMILY_MEMBERS.find((m) => m.role === 'child')?.id
    if (!childId) return 'Участников с ролью «ребёнок» не найдено.'
    const txs = filterRealExpenses(range, { userId: childId, category: 'education' })
    const sum = sumTx(txs)
    if (!sum) return `За выбранный период расходов на образование ребёнка не обнаружено.`
    return `Образование ребёнка за период: ${fmt(sum)} (${txs.length} платежей).`
  },
}
