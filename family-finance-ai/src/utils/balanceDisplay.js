import { formatUzsShortRu } from '../utils.js'

/** Полная сумма UZS с копейками для строк выпадающего списка. */
export function formatUzsFullRu(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '0,00'
  return n
    .toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(',', '.')
}

/** Короткий баланс валютного счёта (как UZS: млн / тыс). */
export function formatForeignBalanceShort(amount, ccy) {
  const v = Math.abs(Number(amount))
  if (!Number.isFinite(v)) return `0 ${ccy}`
  if (v >= 1_000_000) {
    const x = v / 1_000_000
    return `${x.toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 0 })} млн ${ccy}`
  }
  if (v >= 1000) {
    return `${Math.round(v / 1000).toLocaleString('ru-RU')} тыс ${ccy}`
  }
  return `${v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ccy}`
}

/** Одна строка для закрытого селекта: только короткая сумма + валюта. */
export function formatSelectBalanceClosed(card) {
  if (!card) return ''
  if (card.foreignCurrency) {
    return formatForeignBalanceShort(card.balanceForeign ?? 0, card.foreignCurrency)
  }
  return `${formatUzsShortRu(card.balanceUzs ?? 0)} UZS`
}

/** Полная сумма для раскрытого списка. */
export function formatSelectBalanceFull(card) {
  if (!card) return ''
  if (card.foreignCurrency) {
    const n = Number(card.balanceForeign ?? 0)
    const s = n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(',', '.')
    return `${s} ${card.foreignCurrency}`
  }
  return `${formatUzsFullRu(card.balanceUzs ?? 0)} UZS`
}
