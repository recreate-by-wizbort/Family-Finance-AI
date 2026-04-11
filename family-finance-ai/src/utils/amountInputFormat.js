/**
 * Ввод суммы с разделителем тысяч (пробел) и опционально дробной частью (запятая в UI).
 * @param {string} raw — значение из input
 * @param {number} maxDecimals — 0 для UZS, 2 для USD/EUR
 */
export function formatGroupedAmountInput(raw, maxDecimals = 0) {
  let s = String(raw ?? '')
    .replace(/\s/g, '')
    .replace(/,/g, '.')

  const firstDot = s.indexOf('.')
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }

  let intPart = s
  let decPart = ''
  if (maxDecimals > 0 && firstDot !== -1) {
    intPart = s.slice(0, firstDot)
    decPart = s.slice(firstDot + 1)
  }

  intPart = intPart.replace(/\D/g, '')
  if (intPart.length > 1) {
    intPart = intPart.replace(/^0+(?=\d)/, '')
  }

  if (maxDecimals > 0) {
    decPart = decPart.replace(/\D/g, '').slice(0, maxDecimals)
  } else {
    decPart = ''
  }

  const grouped =
    intPart === '' ? '' : intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

  if (maxDecimals > 0 && (firstDot !== -1 || decPart.length > 0)) {
    const intShow = grouped === '' ? '0' : grouped
    return `${intShow},${decPart}`
  }

  return grouped
}

/** Парсит отформатированную строку в число (> 0 для валидной суммы). */
export function parseGroupedAmountString(str) {
  const s = String(str ?? '')
    .replace(/\s/g, '')
    .replace(',', '.')
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n
}
