/** Общая логика группировки по неделе / месяцу / году (мониторинг, аналитика резерва и т.д.). */

export const PERIOD_FILTER_OPTIONS = [
  { id: 'week', label: 'Нед' },
  { id: 'month', label: 'Мес' },
  { id: 'year', label: 'Год' },
]

export function toMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date)
  return monthLabel[0].toUpperCase() + monthLabel.slice(1)
}

export function toIsoWeekInfo(date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const isoYear = utcDate.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoYear, 0, 1))
  const week = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7)
  return { isoYear, week }
}

export function getPeriodKeyFromTimestamp(timestamp, periodMode) {
  const date = new Date(timestamp)

  if (periodMode === 'year') {
    return String(date.getFullYear())
  }

  if (periodMode === 'week') {
    const { isoYear, week } = toIsoWeekInfo(date)
    return `${isoYear}-W${String(week).padStart(2, '0')}`
  }

  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${date.getFullYear()}-${month}`
}

export function getIsoWeekStartDate(isoYear, week) {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1)
  const result = new Date(week1Monday)
  result.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  return result
}

export function getPeriodLabel(periodKey, periodMode) {
  if (periodMode === 'year') {
    return periodKey
  }

  if (periodMode === 'week') {
    const [yearPart, weekPartRaw] = periodKey.split('-W')
    const isoYear = Number(yearPart)
    const week = Number(weekPartRaw)
    const startUtc = getIsoWeekStartDate(isoYear, week)
    const endUtc = new Date(startUtc)
    endUtc.setUTCDate(startUtc.getUTCDate() + 6)
    const startLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(startUtc)
    const endLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(endUtc)
    return `${startLabel} - ${endLabel}`
  }

  return toMonthLabel(periodKey)
}

/** Элементы с полем timestamp (ISO-строка). */
export function groupItemsByPeriod(items, periodMode) {
  const groups = new Map()
  for (const item of items || []) {
    if (!item?.timestamp) {
      continue
    }
    const key = getPeriodKeyFromTimestamp(item.timestamp, periodMode)
    const rows = groups.get(key)
    if (rows) {
      rows.push(item)
    } else {
      groups.set(key, [item])
    }
  }
  return groups
}

export function groupTransactionsByPeriod(transactions, periodMode) {
  return groupItemsByPeriod(transactions, periodMode)
}
