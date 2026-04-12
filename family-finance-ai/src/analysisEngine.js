import { TRANSACTIONS, FAMILY_MEMBERS, NON_EXPENSE_KINDS } from './mockData'
import { loadDeposits, DEPOSIT_RATES, getAccruedInterest, formatDepositCurrency } from './utils/deposits'
import { loadUserAccounts } from './utils/accounts'
import { BANK_PROMOTIONS, PARTNER_PROMOTIONS } from './data/specialOffers'

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

function findRelevantPromo(categoryHint) {
  const allPromos = [...(BANK_PROMOTIONS || []), ...(PARTNER_PROMOTIONS || [])]
  const keywordMap = {
    restaurants: ['ресторан', 'кафе', 'кэшбэк'],
    groceries: ['makro', 'korzinka', 'продукт', 'скидк'],
    transport: ['yandex', 'такси', 'транспорт', 'кэшбэк'],
    deposit: ['вклад', 'бонус', 'депозит'],
    family: ['семь', 'семейн'],
  }
  const keywords = keywordMap[categoryHint] || []
  if (!keywords.length) return null
  for (const promo of allPromos) {
    const text = `${promo.title} ${promo.description}`.toLowerCase()
    if (keywords.some((kw) => text.includes(kw))) return promo
  }
  return null
}

function promoText(promo) {
  if (!promo) return ''
  return `\n\nАкция от банка: ${promo.title}. ${promo.description.split('.')[0]}.`
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
    const prevGroc = realExpenses(prev, { ...scoped(), category: 'groceries' })
    const prevRest = realExpenses(prev, { ...scoped(), category: 'restaurants' })
    const restCount = filterRealExpenses(range, { ...scoped(), category: 'restaurants' }).length
    const prevRestCount = filterRealExpenses(prev, { ...scoped(), category: 'restaurants' }).length

    let explanation = ''
    if (cur > prevSum) {
      const reasons = []
      if (groc > prevGroc) {
        reasons.push(`Продукты выросли на ${pct(groc, prevGroc)} — основная причина: инфляция в Узбекистане (~10-12% годовых), из-за которой цены на продовольствие растут каждый месяц`)
      }
      if (rest > prevRest) {
        const visitDiff = restCount - prevRestCount
        if (visitDiff > 0) {
          reasons.push(`Кафе/рестораны выросли на ${pct(rest, prevRest)} — вы стали ходить чаще (${restCount} визитов vs ${prevRestCount} в прошлом периоде), плюс средний чек растёт из-за подорожания продуктов в общепите`)
        } else {
          reasons.push(`Кафе/рестораны выросли на ${pct(rest, prevRest)} — средний чек увеличился из-за подорожания продуктов и услуг общепита`)
        }
      }
      explanation = reasons.length ? reasons.join('.\n\n') + '.' : 'Рост связан с общей инфляцией и подорожанием продовольствия.'
    } else {
      explanation = 'Расходы в норме или снизились — хорошая динамика. Продолжайте контролировать траты.'
    }

    const restPromo = findRelevantPromo('restaurants')
    const grocPromo = findRelevantPromo('groceries')
    const promoHint = restPromo ? promoText(restPromo) : (grocPromo ? promoText(grocPromo) : '')

    return `За выбранный период расходы на еду и кафе: ${fmt(cur)} (${pct(cur, prevSum)} к предыдущему периоду).\n\nПродукты: ${fmt(groc)}, кафе/рестораны: ${fmt(rest)} (${restCount} визитов).\n\n${explanation}${promoHint}\n\n[КНОПКА: Установить лимит на кафе]\n[КНОПКА: Как сэкономить на еде?]`
  },

  food_save(range) {
    const rest = filterTx(range, { direction: 'out', category: 'restaurants' })
    const restSum = sumTx(rest)
    const avgCheck = rest.length ? Math.round(restSum / rest.length) : 0
    const merchants = topMerchants(range, 'restaurants', 3)
    const topList = merchants.map((m) => `• ${m.name}: ${fmt(m.amount)} (${m.count} раз)`).join('\n')
    const groc = filterTx(range, { direction: 'out', category: 'groceries' })
    const grocSum = sumTx(groc)
    const totalFood = restSum + grocSum
    const savingRest = Math.round(restSum * 0.3)
    const restPromo = findRelevantPromo('restaurants')
    const grocPromo = findRelevantPromo('groceries')
    const promos = [restPromo, grocPromo].filter(Boolean)
    const promoHints = promos.length ? '\n\nВоспользуйтесь акциями банка:\n' + promos.map((p) => `• ${p.title}`).join('\n') : ''

    return `Средний чек в кафе: ${fmt(avgCheck)}. Всего визитов: ${rest.length}.\n\nТоп заведений:\n${topList}\n\nОбщие расходы на питание: ${fmt(totalFood)} (продукты ${fmt(grocSum)} + кафе ${fmt(restSum)}).\n\nКак сэкономить:\n• Готовить дома 2-3 раза в неделю вместо кафе — экономия до ${fmt(savingRest)}\n• Составлять список продуктов перед походом в магазин\n• Покупать сезонные овощи и фрукты — они дешевле${promoHints}\n\n[КНОПКА: Установить лимит на кафе]\n[КНОПКА: Сравнить с прошлым периодом]\n[НАВИГАЦИЯ: Посмотреть акции | /home?open=promotions]`
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

    let insight = ''
    if (totalCur > totalPrev) {
      insight = `\n\nПричины роста: инфляция (~10-12% в год) постоянно повышает цены на продукты. Также влияет сезонность — зимой овощи и фрукты дороже, летом — дешевле.`
    } else {
      insight = '\n\nРасходы снизились — отличный результат! Продолжайте контролировать траты.'
    }

    return `Сравнение с предыдущим периодом:\n${lines.join('\n')}\n\nОбщий итог по еде: ${fmt(totalCur)} (${pct(totalCur, totalPrev)}).${insight}\n\n[КНОПКА: Как сэкономить на еде?]`
  },

  // ── Expenses: Transport ──────────────────────────────────────────────────────
  tr_why(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'transport' })
    const sum = sumTx(txs)
    const prev = prevRange(range)
    const prevTxs = filterRealExpenses(prev, { ...scoped(), category: 'transport' })
    const prevSum = sumTx(prevTxs)
    const avg = txs.length ? Math.round(sum / txs.length) : 0
    const prevAvg = prevTxs.length ? Math.round(prevSum / prevTxs.length) : 0

    let explanation = ''
    if (sum > prevSum) {
      const reasons = []
      if (avg > prevAvg) {
        reasons.push(`Средний чек поездки вырос с ${fmt(prevAvg)} до ${fmt(avg)} — это связано с подорожанием бензина и ростом тарифов на такси из-за инфляции (~10-12% в год)`)
      }
      if (txs.length > prevTxs.length) {
        reasons.push(`Количество поездок увеличилось: ${txs.length} vs ${prevTxs.length} в прошлом периоде`)
      }
      if (!reasons.length) {
        reasons.push('Рост связан с подорожанием топлива и общей инфляцией транспортных услуг')
      }
      explanation = reasons.join('.\n\n') + '.'
    } else {
      explanation = 'Расходы стабильны или снизились — хорошая тенденция.'
    }

    const trPromo = findRelevantPromo('transport')
    const trPromoHint = trPromo ? promoText(trPromo) : ''

    return `Транспорт за период: ${fmt(sum)} (${pct(sum, prevSum)}).\n\nВсего поездок: ${txs.length}, средний чек: ${fmt(avg)}.\n\n${explanation}${trPromoHint}\n\n[КНОПКА: Как оптимизировать транспорт?]\n[КНОПКА: Сравнить с прошлым периодом]\n[НАВИГАЦИЯ: Посмотреть акции | /home?open=promotions]`
  },

  tr_save(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'transport' })
    const sum = sumTx(txs)
    const merchants = topMerchants(range, 'transport', 3)
    const topList = merchants.map((m) => `• ${m.name}: ${fmt(m.amount)} (${m.count} поездок)`).join('\n')
    const savingPublic = Math.round(sum * 0.4)
    const trSavePromo = findRelevantPromo('transport')
    const trSaveHint = trSavePromo ? `\n• ${trSavePromo.title} — оплачивайте картой банка для экономии` : ''

    return `Транспортные расходы за период: ${fmt(sum)}.\n\n${topList}\n\nКак оптимизировать:\n• Замена части поездок на метро/автобус — экономия до ${fmt(savingPublic)}\n• Совмещайте несколько дел за одну поездку\n• Рассмотрите абонемент на общественный транспорт\n• Для коротких маршрутов — пешком (полезно и бесплатно)${trSaveHint}\n\n[КНОПКА: Установить лимит на транспорт]\n[НАВИГАЦИЯ: Посмотреть акции | /home?open=promotions]`
  },

  // ── Expenses: Subscriptions ──────────────────────────────────────────────────
  sub_list(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'subscriptions' })
    if (!txs.length) return 'За выбранный период расходов на подписки не обнаружено.\n\n[КНОПКА: Проверить другие расходы]'
    const merchants = topMerchants(range, 'subscriptions', 10)
    const list = merchants.map((m) => `• ${m.name}: ${fmt(m.amount)}`).join('\n')
    const total = sumTx(txs)
    const prev = prevRange(range)
    const prevTotal = realExpenses(prev, { ...scoped(), category: 'subscriptions' })
    let trend = ''
    if (prevTotal > 0 && total > prevTotal) {
      trend = `\n\nРост на ${pct(total, prevTotal)} к прошлому периоду — возможно, добавились новые подписки или подорожали существующие.`
    }
    return `Подписки за период:\n${list}\n\nИтого: ${fmt(total)}.${trend}\n\n[КНОПКА: Что можно отключить?]`
  },

  sub_cut(range) {
    const merchants = topMerchants(range, 'subscriptions', 10)
    if (!merchants.length) return 'Активных подписок за период не обнаружено.'
    const smallest = merchants[merchants.length - 1]
    const totalSaving = merchants.slice(Math.max(0, merchants.length - 2)).reduce((s, m) => s + m.amount, 0)
    return `Кандидаты на отключение:\n• ${smallest.name}: ${fmt(smallest.amount)} — наименее используемая подписка.\n\nОтключив неиспользуемые подписки, вы можете сэкономить до ${fmt(totalSaving)} за аналогичный период.\n\nСовет: проверьте, какими подписками вы реально пользуетесь хотя бы раз в неделю.\n\n[КНОПКА: Обзор всех расходов]`
  },

  // ── Expenses: Utilities ──────────────────────────────────────────────────────
  ut_overview(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'utilities' })
    if (!txs.length) return 'За выбранный период коммунальных платежей не обнаружено.'
    const sum = sumTx(txs)
    const prev = prevRange(range)
    const prevSum = realExpenses(prev, { ...scoped(), category: 'utilities' })
    const merchants = topMerchants(range, 'utilities', 5)
    const list = merchants.map((m) => `• ${m.name}: ${fmt(m.amount)}`).join('\n')

    let trend = ''
    if (prevSum > 0 && sum > prevSum) {
      const month = range.start.getMonth()
      const isCold = month >= 9 || month <= 2
      const isHot = month >= 5 && month <= 7
      if (isCold) {
        trend = `\n\nРост на ${pct(sum, prevSum)} — это типично для холодного сезона: увеличивается расход на отопление и электроэнергию.`
      } else if (isHot) {
        trend = `\n\nРост на ${pct(sum, prevSum)} — в жаркий сезон увеличиваются расходы на кондиционирование.`
      } else {
        trend = `\n\nРост на ${pct(sum, prevSum)} — возможно, повысились тарифы на коммунальные услуги.`
      }
    }
    return `Коммунальные платежи: ${fmt(sum)}.${trend}\n\n${list}\n\n[КНОПКА: Как сократить коммунальные?]\n[КНОПКА: Настроить автоплатёж]`
  },

  ut_save(range) {
    const cur = exp(range, { category: 'utilities' })
    const prev = prevRange(range)
    const prevSum = realExpenses(prev, { ...scoped(), category: 'utilities' })
    const month = range.start.getMonth()
    const isCold = month >= 9 || month <= 2

    let advice = ''
    if (cur > prevSum) {
      advice = isCold
        ? 'Рост сезонный — зимой расходы на отопление выше. Рекомендации:\n• Проверьте утепление окон и дверей\n• Используйте энергосберегающие лампы\n• Проверьте тариф интернета — возможно, есть выгоднее'
        : 'Рост может быть вызван повышением тарифов или увеличением потребления. Рекомендации:\n• Установите счётчики, если их нет\n• Проверьте тариф интернета — возможно, есть выгоднее\n• Отключайте неиспользуемые электроприборы'
    } else {
      advice = 'Расходы стабильны — хорошая динамика. Для ещё большей экономии настройте автоплатёж, чтобы избежать пени за просрочку.'
    }
    return `Коммунальные: ${fmt(cur)} (${pct(cur, prevSum)} к прошлому периоду).\n\n${advice}\n\n[КНОПКА: Настроить автоплатёж]`
  },

  // ── Expenses: Marketplace ────────────────────────────────────────────────────
  mp_total(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'shopping' })
    const sum = sumTx(txs)
    const prev = prevRange(range)
    const prevTxs = filterRealExpenses(prev, { ...scoped(), category: 'shopping' })
    const prevSum = sumTx(prevTxs)
    const avgCheck = txs.length ? Math.round(sum / txs.length) : 0

    let explanation = ''
    if (sum > prevSum && prevSum > 0) {
      const reasons = []
      if (txs.length > prevTxs.length) {
        reasons.push(`Количество покупок увеличилось: ${txs.length} vs ${prevTxs.length} — чаще заказываете онлайн`)
      }
      if (avgCheck > (prevTxs.length ? Math.round(prevSum / prevTxs.length) : 0)) {
        reasons.push('Средний чек вырос — возможно, из-за подорожания товаров или более дорогих покупок')
      }
      explanation = reasons.length ? reasons.join('. ') + '.' : 'Рост может быть связан с распродажами и акциями, стимулирующими покупки.'
    } else {
      explanation = 'Расходы в норме — хороший контроль над онлайн-покупками.'
    }

    return `Маркетплейсы за период: ${fmt(sum)} (${txs.length} покупок, ${pct(sum, prevSum)}).\n\nСредний чек: ${fmt(avgCheck)}.\n\n${explanation}\n\n[КНОПКА: Как контролировать покупки?]\n[КНОПКА: Установить лимит]`
  },

  mp_save(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'shopping' })
    const sum = sumTx(txs)
    const saving = Math.round(sum * 0.3)
    return `Маркетплейсы: ${fmt(sum)} за ${txs.length} покупок.\n\nКак контролировать:\n• Удалите сохранённые карты из приложений — лишний шаг перед покупкой помогает задуматься\n• Правило 24 часов: отложите покупку на день, если сумма > 100 тыс.\n• Ведите вишлист: записывайте желания и покупайте только через неделю\n• Отпишитесь от рассылок распродаж\n\nПотенциал экономии: ~${fmt(saving)}.\n\n[КНОПКА: Установить лимит на маркетплейсы]`
  },

  // ── Expenses: Health ─────────────────────────────────────────────────────────
  h_overview(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'health' })
    const sum = sumTx(txs)
    const prev = prevRange(range)
    const prevSum = realExpenses(prev, { ...scoped(), category: 'health' })
    const income = inc(range)
    const ratio = income ? Math.round((sum / income) * 100) : 0
    const merchants = topMerchants(range, 'health', 3)
    const list = merchants.length ? merchants.map((m) => `• ${m.name}: ${fmt(m.amount)} (${m.count} раз)`).join('\n') : ''

    let trend = ''
    if (prevSum > 0 && sum > prevSum) {
      trend = `\nРост на ${pct(sum, prevSum)} — это может быть связано с подорожанием медицинских услуг и лекарств, а также сезонными заболеваниями.`
    }

    return `Здоровье за период: ${fmt(sum)} (${ratio}% от дохода).${trend}\n\n${list ? list + '\n\n' : ''}Рекомендуемый резерв на медицину: 5-10% от дохода (~${fmt(Math.round(income * 0.07))}).\n\nСовет: рассмотрите медицинскую страховку — она может сэкономить при крупных расходах.\n\n[КНОПКА: Обзор всех расходов]`
  },

  // ── Expenses: Entertainment ──────────────────────────────────────────────────
  ent_overview(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'entertainment' })
    const sum = sumTx(txs)
    const prev = prevRange(range)
    const prevSum = realExpenses(prev, { ...scoped(), category: 'entertainment' })
    const income = inc(range)
    const ratio = income ? Math.round((sum / income) * 100) : 0
    const merchants = topMerchants(range, 'entertainment', 3)
    const list = merchants.map((m) => `• ${m.name}: ${fmt(m.amount)} (${m.count} раз)`).join('\n')

    let trend = ''
    if (prevSum > 0 && sum > prevSum) {
      trend = `\nРост на ${pct(sum, prevSum)} — это может быть связано с сезонными мероприятиями, повышением цен на билеты и подписки, или увеличением количества посещений.`
    }

    const isOverBudget = ratio > 30
    const advice = isOverBudget
      ? `\n\nВнимание: вы тратите ${ratio}% от дохода на развлечения — это превышает рекомендуемые 30%. Рассмотрите бесплатные альтернативы.`
      : `\n\nРасходы на развлечения: ${ratio}% от дохода — в рамках нормы (до 30%).`

    return `Развлечения за период: ${fmt(sum)}.${trend}\n\n${list}${advice}\n\n[КНОПКА: Установить лимит на развлечения]`
  },

  // ── Expenses: Clothing ───────────────────────────────────────────────────────
  cl_overview(range) {
    const txs = filterRealExpenses(range, { ...scoped(), category: 'clothes' })
    const sum = sumTx(txs)
    const prev = prevRange(range)
    const prevSum = realExpenses(prev, { ...scoped(), category: 'clothes' })
    const merchants = topMerchants(range, 'clothes', 3)
    const list = merchants.length ? merchants.map((m) => `• ${m.name}: ${fmt(m.amount)} (${m.count} покупок)`).join('\n') : ''

    let trend = ''
    if (prevSum > 0 && sum > prevSum) {
      const month = range.start.getMonth()
      const isSeason = (month >= 2 && month <= 3) || (month >= 8 && month <= 9)
      trend = isSeason
        ? `\nРост на ${pct(sum, prevSum)} — типично для смены сезона: обновление гардероба весной/осенью.`
        : `\nРост на ${pct(sum, prevSum)} — возможно, связан с распродажами или подорожанием текстиля из-за инфляции.`
    }

    return `Одежда за период: ${fmt(sum)} (${pct(sum, prevSum)}).${trend}\n\n${list ? list + '\n\n' : ''}Советы:\n• Планируйте крупные покупки заранее — составьте капсульный гардероб\n• Покупайте базовые вещи в межсезон со скидками\n• Избегайте импульсного шоппинга\n\n[КНОПКА: Установить лимит на одежду]`
  },

  // ── Expenses: Education ──────────────────────────────────────────────────────
  edu_overview(range) {
    const sum = exp(range, { category: 'education' })
    if (!sum) return 'За выбранный период расходов на образование не обнаружено.\n\n[КНОПКА: Обзор всех расходов]'
    const prev = prevRange(range)
    const prevSum = realExpenses(prev, { ...scoped(), category: 'education' })
    const merchants = topMerchants(range, 'education', 3)
    const list = merchants.length ? merchants.map((m) => `• ${m.name}: ${fmt(m.amount)}`).join('\n') : ''

    let trend = ''
    if (prevSum > 0 && sum > prevSum) {
      trend = `\nРост на ${pct(sum, prevSum)} — может быть связан с началом нового учебного семестра, подорожанием курсов или добавлением нового обучения.`
    }

    return `Образование за период: ${fmt(sum)} (${pct(sum, prevSum)}).${trend}\n\n${list ? list + '\n\n' : ''}Образование — инвестиция в будущее. Эти платежи учтены как регулярные в прогнозе бюджета.\n\n[КНОПКА: Обзор всех расходов]`
  },

  // ── Income ───────────────────────────────────────────────────────────────────
  sal_analysis(range) {
    const txs = filterRealIncome(range, scoped())
    const sum = sumTx(txs)
    const prev = prevRange(range)
    const prevSum = sumTx(filterRealIncome(prev, scoped()))
    const salaryTxs = txs.filter((tx) => (tx.description || '').toLowerCase().includes('зарплат') || (tx.merchant || '').toLowerCase().includes('salary'))
    const salarySum = sumTx(salaryTxs)

    let trend = ''
    if (prevSum > 0) {
      trend = sum > prevSum
        ? `\n\nРост поступлений на ${pct(sum, prevSum)} — хорошая динамика.`
        : sum < prevSum
          ? `\n\nСнижение на ${pct(sum, prevSum)} — возможно, задержка зарплаты или разовые поступления в прошлом периоде.`
          : ''
    }

    return `Реальные поступления за период (без внутренних переводов): ${fmt(sum)}.${trend}\n\n${salaryTxs.length ? `Зарплата: ${fmt(salarySum)} (${salaryTxs.length} поступлений).` : 'Зарплатных поступлений не определено — AI определяет их по регулярным крупным входящим.'}\n\n[КНОПКА: Проценты и кэшбэк]\n[КНОПКА: Как увеличить доход?]`
  },

  pas_overview(range) {
    const txs = filterRealIncome(range, scoped())
    const sum = sumTx(txs)

    const deposits = loadDeposits()
    const accounts = loadUserAccounts()

    const lines = [`Реальные поступления за период (без переводов между счетами): ${fmt(sum)}.`]

    if (deposits.length > 0) {
      lines.push('\nВаши вклады:')
      for (const dep of deposits) {
        const interest = getAccruedInterest(dep)
        const amountStr = formatDepositCurrency(dep.amount, dep.currency)
        const interestStr = formatDepositCurrency(interest, dep.currency)
        const typeLabel = dep.withdrawable ? 'с возможностью снятия' : 'фиксированный'
        lines.push(`• ${amountStr} (${dep.rate}% годовых, ${typeLabel}) — начислено процентов: ${interestStr}`)
      }
    } else {
      lines.push('\nУ вас пока нет открытых вкладов.')
    }

    if (accounts.length > 0) {
      lines.push('\nВаши счета:')
      for (const acc of accounts) {
        const label = acc.label || 'Счёт'
        const amountStr = acc.currency === 'UZS' ? fmt(acc.amount) : formatDepositCurrency(acc.amount, acc.currency)
        lines.push(`• ${label}: ${amountStr}`)
      }
    }

    const bestRate = DEPOSIT_RATES.UZS.fixed
    const depositPromo = findRelevantPromo('deposit')
    if (depositPromo) {
      lines.push(`\nАкция банка: ${depositPromo.title} — ${depositPromo.description.split('.')[0]}.`)
    }
    lines.push(`\nДля увеличения пассивного дохода рассмотрите вклад с капитализацией (до ${bestRate}% годовых по UZS).`)

    lines.push('\n[НАВИГАЦИЯ: Открыть вклад | /home?open=deposit]')
    lines.push('[НАВИГАЦИЯ: Посмотреть счета | /home?open=accounts]')
    lines.push('[НАВИГАЦИЯ: Посмотреть акции | /home?open=promotions]')

    return lines.join('\n')
  },

  /** Ориентир по сумме из свободного остатка (без подбора инструментов) — для кнопки «Посоветовать» после FAQ про инвестиции */
  inv_advise(range) {
    const income = inc(range)
    const expenses = exp(range)
    const free = Math.max(0, income - expenses)
    if (free <= 0) {
      return `Свободного остатка за период нет: расходы не меньше дохода. Сначала выровняйте бюджет — направлять средства в инвестиции пока рано.\n\n[КНОПКА: Где сэкономить?]\n[КНОПКА: Как спланировать бюджет?]`
    }
    const invPrev = sumTx(filterRealExpenses(range, { ...scoped(), category: 'investment_contribution' }))
    const buffer = Math.round(free * 0.35)
    const toGoals = Math.round(free * 0.45)
    const forInvest = Math.max(0, free - buffer - toGoals)
    const lines = [
      `За выбранный период (по вашим операциям): доход ${fmt(income)}, расходы ${fmt(expenses)}, свободный остаток ${fmt(free)}.`,
    ]
    if (invPrev > 0) lines.push(`\nУже есть пополнения по категории «Инвестиции»: ${fmt(invPrev)}.`)
    lines.push(
      '\nЭто не подбор инструментов (нужна лицензия), а ориентировочное деление свободного остатка:',
      `• ${fmt(buffer)} — держать ликвидным буфером`,
      `• ${fmt(toGoals)} — приоритетно цели и накопления (вклад)`,
      `• до ${fmt(forInvest)} — верхняя зона для регулярных пополнений инвестсчёта, если подушка и обязательные платежи уже закрыты`,
      '\nЕсли остаток небольшой, уменьшите долю на инвестиции в пользу буфера.',
      '\n[НАВИГАЦИЯ: Перевести на вклад | /home?open=deposits]',
      '[НАВИГАЦИЯ: Перейти к целям | /goal]',
    )
    return lines.join('\n')
  },

  // ── Goals ────────────────────────────────────────────────────────────────────
  car_prog(range) {
    const expenses = exp(range)
    const income = inc(range)
    const free = income - expenses
    return `За период: доход ${fmt(income)}, расходы ${fmt(expenses)}, свободный остаток ${fmt(Math.max(0, free))}.\n\nЕсли направить свободный остаток на цель «Машина», это ускорит накопление.\n\n[КНОПКА: Как ускорить накопление?]\n[НАВИГАЦИЯ: Перейти к целям | /goal]`
  },

  car_fast(range) {
    const expenses = exp(range)
    const income = inc(range)
    const free = Math.max(0, income - expenses)
    const breakdown = brkdown(range)
    const optimizable = breakdown.filter((c) => ['restaurants', 'entertainment', 'shopping'].includes(c.cat))
    const potentialSaving = optimizable.reduce((s, c) => s + Math.round(c.amount * 0.3), 0)
    const lines = optimizable.map((c) => `• ${c.label}: потратили ${fmt(c.amount)}, если тратить на 30% меньше — экономия ~${fmt(Math.round(c.amount * 0.3))}`).join('\n')
    return `Свободный остаток: ${fmt(free)}.\n\nЕсли начать тратить на 30% меньше в кафе, развлечениях и маркетплейсах, можно дополнительно сэкономить ~${fmt(potentialSaving)}:\n${lines}\n\nИтого на цель «Машина» можно направить: ~${fmt(free + potentialSaving)}.\n\n[КНОПКА: Составить план накопления]\n[НАВИГАЦИЯ: Перейти к целям | /goal]`
  },

  vac_prog(range) {
    const income = inc(range)
    const expenses = exp(range)
    return `Доход: ${fmt(income)}, расходы: ${fmt(expenses)}.\n\nСвободный остаток ${fmt(Math.max(0, income - expenses))} можно направить на цель «Отпуск».\n\n[КНОПКА: Как ускорить?]\n[НАВИГАЦИЯ: Перейти к целям | /goal]`
  },

  vac_fast(range) {
    const breakdown = brkdown(range)
    const optimizable = breakdown.filter((c) => ['restaurants', 'entertainment', 'shopping', 'clothes'].includes(c.cat))
    if (!optimizable.length) return 'За выбранный период нет подходящих категорий для ускорения накопления на отпуск.\n\n[НАВИГАЦИЯ: Перейти к целям | /goal]'
    const saving = optimizable.reduce((s, c) => s + Math.round(c.amount * 0.25), 0)
    const lines = optimizable
      .map((c) => `• ${c.label}: потратили ${fmt(c.amount)}. Если тратить на 25% меньше, экономия составит ~${fmt(Math.round(c.amount * 0.25))}`)
      .join('\n')
    return `Как быстрее накопить на отпуск

Если в этих категориях начать тратить на 25% меньше:

${lines}

Итого дополнительно на отпуск: ~${fmt(saving)}.

[КНОПКА: Где ещё сэкономить?]
[НАВИГАЦИЯ: Перейти к целям | /goal]`
  },

  saf_prog(range) {
    const income = inc(range)
    const expenses = exp(range)
    return `За период: доход ${fmt(income)}, расходы ${fmt(expenses)}.\n\nРекомендуемая подушка: 3-6 мес. расходов (${fmt(expenses * 3)} – ${fmt(expenses * 6)}).\n\nПодушка безопасности — ваш фундамент. Без неё любые непредвиденные расходы могут привести к долгам.\n\n[КНОПКА: Как быстрее накопить подушку?]\n[НАВИГАЦИЯ: Открыть вклад для подушки | /home?open=deposit]`
  },

  saf_advice(range) {
    const expenses = exp(range)
    return `При расходах ${fmt(expenses)} за период, идеальная подушка: ${fmt(expenses * 3)} – ${fmt(expenses * 6)}.\n\nПорядок действий:\n1. Откладывайте 10% от дохода в первую очередь\n2. Храните подушку на накопительном счёте (не на обычной карте — там она «тает» из-за инфляции)\n3. После накопления 3 мес. расходов — переходите к другим целям\n\n[НАВИГАЦИЯ: Открыть накопительный счёт | /home?open=deposit]`
  },

  house_plan(range) {
    const income = inc(range)
    const expenses = exp(range)
    const free = Math.max(0, income - expenses)
    const monthlyTarget = Math.round(free * 0.5)
    return `Свободный остаток за период: ${fmt(free)}.\n\nДля первоначального взноса на жильё начните откладывать ${fmt(monthlyTarget)} ежемесячно.\n\nСовет: рассмотрите вклад для накоплений — при ставке 20% годовых ваши деньги будут работать.\n\n[НАВИГАЦИЯ: Открыть вклад | /home?open=deposit]\n[НАВИГАЦИЯ: Перейти к целям | /goal]`
  },

  // ── Forecast ─────────────────────────────────────────────────────────────────
  end_enough(range) {
    const income = inc(range)
    const expenses = exp(range)
    const daysInPeriod = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86400000))
    const now = new Date()
    const daysLeft = Math.max(0, Math.round((range.end.getTime() - now.getTime()) / 86400000))
    const dailyRate = expenses / daysInPeriod
    const remaining = income - expenses
    const projectedRemaining = remaining - (dailyRate * daysLeft)

    let advice = ''
    if (remaining > 0) {
      if (daysLeft > 0 && projectedRemaining < 0) {
        advice = `Бюджет пока в норме, но при текущем темпе трат (${fmt(Math.round(dailyRate))}/день) к концу периода может не хватить ~${fmt(Math.abs(Math.round(projectedRemaining)))}. Рекомендую сократить необязательные расходы.`
      } else {
        advice = `Бюджет в норме. До конца периода осталось ${daysLeft} дней.`
      }
    } else {
      advice = `Внимание: расходы превысили доходы на ${fmt(Math.abs(Math.round(remaining)))}! Рекомендую пересмотреть траты в оставшиеся ${daysLeft} дней.`
    }

    return `Расходы за период: ${fmt(expenses)} (~${fmt(Math.round(dailyRate))}/день, ${daysInPeriod} дней).\n\nОстаток: ${fmt(Math.max(0, remaining))}.\n\n${advice}\n\n[КНОПКА: Где сэкономить?]\n[КНОПКА: Сколько отложить?]`
  },

  end_save(range) {
    const income = inc(range)
    const expenses = exp(range)
    const free = Math.max(0, income - expenses)
    const toSave = Math.round(free * 0.6)
    const buffer = free - toSave
    return `Свободный остаток: ${fmt(free)}.\n\nРекомендация:\n• ${fmt(toSave)} — направить на цели/накопления\n• ${fmt(buffer)} — оставить как буфер на непредвиденные расходы\n\nСовет: переведите ${fmt(toSave)} на цель или вклад прямо сейчас, пока не потратили.\n\n[НАВИГАЦИЯ: Перевести на вклад | /home?open=deposits]\n[НАВИГАЦИЯ: Перейти к целям | /goal]`
  },

  next_pred(range) {
    const expenses = exp(range)
    const predicted = Math.round(expenses * 1.05)
    const inflationAdd = Math.round(expenses * 0.01)
    return `Расходы за текущий период: ${fmt(expenses)}.\n\nПрогноз на следующий: ~${fmt(predicted)}.\n\nПочему +5%: инфляция в Узбекистане (~10-12% годовых, т.е. ~1% в месяц) плюс сезонные колебания. Ежемесячно расходы растут в среднем на ${fmt(inflationAdd)} только из-за роста цен.\n\n[КНОПКА: Как спланировать бюджет?]`
  },

  next_plan(range) {
    const breakdown = brkdown(range)
    const lines = breakdown.slice(0, 6).map((c) => `• ${c.label}: ${fmt(c.amount)}`).join('\n')
    const total = breakdown.reduce((s, c) => s + c.amount, 0)
    const reserve = Math.round(total * 0.1)
    return `Рекомендуемый бюджет (на основе текущих расходов ${fmt(total)}):\n${lines}\n\nПлюс резерв на непредвиденные: ~${fmt(reserve)}.\n\nСовет: в первый день периода сразу переведите деньги на цели и резерв — и тратьте только оставшееся.\n\n[КНОПКА: Где сэкономить?]`
  },

  // ── Optimize ─────────────────────────────────────────────────────────────────
  opt_tips(range) {
    const breakdown = brkdown(range)
    const targets = breakdown.filter((c) => ['restaurants', 'entertainment', 'shopping', 'transport', 'clothes'].includes(c.cat))
    if (!targets.length) return 'За выбранный период нет гибких категорий для оценки экономии.\n\n[КНОПКА: Обзор расходов]'
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
• Одежда и развлечения — выделите фиксированную сумму на месяц и не превышайте её.

Также воспользуйтесь акциями банка — кэшбэк и скидки помогут тратить меньше в привычных местах.

[КНОПКА: Автоматизировать экономию]
[НАВИГАЦИЯ: Направить на вклад | /home?open=deposit]
[НАВИГАЦИЯ: Посмотреть акции | /home?open=promotions]`
  },

  auto_tips(range) {
    const breakdown = brkdown(range)
    const recurring = breakdown.filter((c) => ['utilities', 'subscriptions'].includes(c.cat))
    const lines = recurring.map((c) => `• ${c.label}: ${fmt(c.amount)} → автоплатёж`).join('\n')
    return `Что можно автоматизировать:\n${lines || '• Коммунальные → автоплатёж\n• Накопления → автоперевод в день зарплаты'}\n\nДополнительно:\n• Округление покупок с переводом разницы на цель — незаметно, но за месяц набирается 50-100 тыс.\n• Автоперевод 10-20% зарплаты на вклад в день поступления\n• Автоматические напоминания о приближении к лимитам\n\n[КНОПКА: Настроить лимиты]`
  },

  cmp_detail(range) {
    const prev = prevRange(range)
    const curBreak = brkdown(range)
    const prevBreak = brkdown(prev)
    const prevMap = new Map(prevBreak.map((c) => [c.cat, c.amount]))
    const grown = []
    const declined = []
    const lines = curBreak.slice(0, 6).map((c) => {
      const pr = prevMap.get(c.cat) || 0
      if (c.amount > pr && pr > 0) grown.push(c.label)
      if (c.amount < pr && pr > 0) declined.push(c.label)
      return `• ${c.label}: ${fmt(c.amount)} (${pct(c.amount, pr)})`
    }).join('\n')
    const curTotal = curBreak.reduce((s, c) => s + c.amount, 0)
    const prevTotal = prevBreak.reduce((s, c) => s + c.amount, 0)

    let summary = ''
    if (curTotal > prevTotal) {
      summary = `\nОбщий рост на ${pct(curTotal, prevTotal)} — основные причины: инфляция (~1% в месяц) и ${grown.length ? `увеличение трат в категориях: ${grown.join(', ')}` : 'общее удорожание товаров и услуг'}.`
    } else {
      summary = `\nОбщие расходы снизились на ${pct(curTotal, prevTotal)} — хорошая динамика!${declined.length ? ` Удалось сэкономить на: ${declined.join(', ')}.` : ''}`
    }

    return `Сравнение периодов:\n${lines}\n\nОбщие расходы: ${fmt(curTotal)} (${pct(curTotal, prevTotal)}).${summary}\n\n[КНОПКА: Где сэкономить?]`
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

    const totalCur = members.reduce((s, m) => s + m.amount, 0)
    const totalPrev = prevMembers.reduce((s, m) => s + m.amount, 0)
    let trend = ''
    if (totalPrev > 0 && totalCur > totalPrev) {
      trend = `\n\nОбщий рост семейных расходов на ${pct(totalCur, totalPrev)} — связан с инфляцией и подорожанием товаров и услуг.`
    }

    return `Расходы по членам семьи:\n${lines}\n\nДинамика: ${growthLines || 'нет данных за прошлый период'}.${trend}\n\n[КНОПКА: Проверить аномалии]\n[НАВИГАЦИЯ: Семейная группа | /family]`
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
    return `Семейный свободный остаток за период: ${fmt(free)}.\n\nРекомендуемый вклад в семейные цели: ${fmt(Math.round(free * 0.3))}.\n\n[НАВИГАЦИЯ: Перейти к целям | /goal]\n[НАВИГАЦИЯ: Семейная группа | /family]`
  },

  fg_dist(range) {
    const members = memberBreakdown(range)
    const totalIncome = inc(range)
    const lines = members.map((m) => {
      const memberIncome = realIncome(range, { userId: m.userId })
      const share = totalIncome ? Math.round((memberIncome / totalIncome) * 100) : 0
      return `• ${m.name}: ${share}% (по доходу)`
    }).join('\n')
    return `Рекомендуемое распределение вкладов в цели:\n${lines}\n\nПринцип: кто больше зарабатывает — тот больше вносит. Это справедливо и снижает нагрузку на участников с меньшим доходом.\n\n[НАВИГАЦИЯ: Семейная группа | /family]`
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
    return `За период: доход ${fmt(income)}, расходы ${fmt(expenses)}.\n\nРекомендуемый резерв семьи: ${fmt(expenses * 3)} (3 мес. расходов).\n\nСовет: храните резерв на вкладе — при ставке 18-20% годовых деньги будут работать, а не обесцениваться из-за инфляции.\n\n[НАВИГАЦИЯ: Открыть вклад | /home?open=deposit]`
  },

  fbr_plan(range) {
    const expenses = exp(range)
    const target = expenses * 3
    const monthly = Math.round(target / 6)
    return `Для резерва ${fmt(target)} (3 мес.) откладывайте ${fmt(monthly)} ежемесячно — цель за 6 месяцев.\n\nПлан:\n1. Настройте автоперевод ${fmt(monthly)} в день зарплаты\n2. Положите деньги на вклад с возможностью снятия (18% годовых)\n3. Не трогайте резерв для обычных покупок\n\n[НАВИГАЦИЯ: Открыть вклад | /home?open=deposit]`
  },

  fbo_tips(range) {
    const breakdown = brkdown(range)
    const targets = breakdown.filter((c) => ['restaurants', 'entertainment', 'shopping', 'transport'].includes(c.cat))
    if (!targets.length) return 'За выбранный период нет подходящих категорий для оценки семейной экономии.\n\n[КНОПКА: Обзор расходов семьи]'
    const lines = targets
      .map((c) => `• ${c.label}: семья потратила ${fmt(c.amount)}. Если тратить на 25% меньше, экономия составит ~${fmt(Math.round(c.amount * 0.25))}`)
      .join('\n')
    const totalSaving = targets.reduce((s, c) => s + Math.round(c.amount * 0.25), 0)
    return `Где семья может сэкономить

Если начать тратить на 25% меньше в этих категориях:

${lines}

Итого можно сэкономить: ~${fmt(totalSaving)} и направить на семейные цели.

Что обычно помогает семье:
• Общий лимит на кафе/доставку
• «Потолок» на маркетплейсы на месяц
• Договариваться о крупных покупках заранее
• Совместное планирование меню на неделю${(() => { const p = findRelevantPromo('family'); return p ? `\n\nАкция банка: ${p.title} — ${p.description.split('.')[0]}.` : '' })()}

[КНОПКА: Сравнить с прошлым периодом]
[НАВИГАЦИЯ: Семейные цели | /goal]
[НАВИГАЦИЯ: Посмотреть акции | /home?open=promotions]`
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
