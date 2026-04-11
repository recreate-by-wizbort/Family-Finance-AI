/** Платёжная система по первым 4 цифрам номера карты (упрощённые правила BIN). */
export function getProcessingSystemFromFirstFour(digits) {
  const f = String(digits).replace(/\D/g, '').slice(0, 4)
  if (f.length < 4) {
    return null
  }
  const n = parseInt(f, 10)
  if (f[0] === '4') {
    return 'VISA'
  }
  if (n >= 5100 && n <= 5599) {
    return 'MASTERCARD'
  }
  if (n >= 2221 && n <= 2720) {
    return 'MASTERCARD'
  }
  if (f === '9860') {
    return 'HUMO'
  }
  if (f === '8600' || f === '5614') {
    return 'UZCARD'
  }
  if (f[0] === '5') {
    return 'MASTERCARD'
  }
  return 'UZCARD'
}

/** Срок MM/YY или MM/YYYY: карта действительна до конца указанного месяца включительно. */
export function isCardExpiryValid(expiryRaw) {
  const s = String(expiryRaw).trim()
  const m = s.match(/^(\d{1,2})\s*[/\-.]\s*(\d{2}|\d{4})$/)
  if (!m) {
    return false
  }
  let month = parseInt(m[1], 10)
  let year = parseInt(m[2], 10)
  if (m[2].length === 2) {
    year += 2000
  }
  if (month < 1 || month > 12) {
    return false
  }
  const lastMs = new Date(year, month, 0, 23, 59, 59, 999).getTime()
  return lastMs >= Date.now()
}

export function randomUzsBalanceUpTo(maxUzs = 10_000_000) {
  const cents = Math.floor(Math.random() * (maxUzs * 100 + 1))
  return Math.round(cents) / 100
}
