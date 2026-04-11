/**
 * 6-значный BIN → название банка-эмитента (рынок Узбекистана).
 * UZCARD: 8600NN, HUMO: 9860NN, где NN = код банка в системе.
 * Международные карты UZ-банков: стандартный 6-значный BIN.
 */
const UZ_BANK_BIN_MAP = {
  // ── UZCARD (8600) ────────────────────────────────────────────
  '860011': 'Asaka Bank',
  '860012': 'Asaka Bank',
  '860013': 'Asaka Bank',
  '860020': 'Milliy Bank',
  '860021': 'Milliy Bank',
  '860022': 'Milliy Bank',
  '860025': 'Milliy Bank',
  '860030': 'Orient Finans Bank',
  '860031': 'Orient Finans Bank',
  '860032': 'Orient Finans Bank',
  '860040': 'Aloqabank',
  '860041': 'Aloqabank',
  '860042': 'Aloqabank',
  '860043': 'TBC Bank Uzbekistan',
  '860044': 'TBC Bank Uzbekistan',
  '860045': 'Ipoteka Bank',
  '860046': 'Ipoteka Bank',
  '860047': 'Ipoteka Bank',
  '860050': 'Ipoteka Bank',
  '860051': 'Ipoteka Bank',
  '860052': 'Ipoteka Bank',
  '860053': 'Ipoteka Bank',
  '860054': 'Kapitalbank',
  '860055': 'Kapitalbank',
  '860056': 'Kapitalbank',
  '860057': 'Kapitalbank',
  '860060': 'Xalq Bank',
  '860061': 'Xalq Bank',
  '860062': 'Xalq Bank',
  '860063': 'Xalq Bank',
  '860065': 'SQB',
  '860066': 'SQB',
  '860070': 'Agrobank',
  '860071': 'Agrobank',
  '860072': 'Agrobank',
  '860073': 'Agrobank',
  '860080': 'Hamkorbank',
  '860081': 'Hamkorbank',
  '860082': 'Hamkorbank',
  '860083': 'Hamkorbank',
  '860085': 'Anorbank',
  '860086': 'Anorbank',
  '860090': 'Mikrokreditbank',
  '860091': 'Mikrokreditbank',
  '860092': 'Mikrokreditbank',
  '860095': 'Davr Bank',
  '860096': 'Davr Bank',
  '860097': 'Uzum Bank',
  '860098': 'Uzum Bank',

  // ── HUMO (9860) ──────────────────────────────────────────────
  '986011': 'Asaka Bank',
  '986012': 'Asaka Bank',
  '986020': 'Milliy Bank',
  '986021': 'Milliy Bank',
  '986022': 'Milliy Bank',
  '986030': 'Orient Finans Bank',
  '986031': 'Orient Finans Bank',
  '986040': 'Aloqabank',
  '986041': 'Aloqabank',
  '986043': 'TBC Bank Uzbekistan',
  '986044': 'TBC Bank Uzbekistan',
  '986050': 'Ipoteka Bank',
  '986051': 'Ipoteka Bank',
  '986054': 'Kapitalbank',
  '986055': 'Kapitalbank',
  '986056': 'Kapitalbank',
  '986060': 'Xalq Bank',
  '986061': 'Xalq Bank',
  '986062': 'Xalq Bank',
  '986065': 'SQB',
  '986066': 'SQB',
  '986070': 'Agrobank',
  '986071': 'Agrobank',
  '986072': 'Agrobank',
  '986080': 'Hamkorbank',
  '986081': 'Hamkorbank',
  '986085': 'Anorbank',
  '986086': 'Anorbank',
  '986090': 'Mikrokreditbank',
  '986091': 'Mikrokreditbank',
  '986095': 'Davr Bank',
  '986096': 'Davr Bank',
  '986097': 'Uzum Bank',
  '986098': 'Uzum Bank',

  // ── VISA — карты узбекских банков ────────────────────────────
  '402040': 'TBC Bank Uzbekistan',
  '402041': 'TBC Bank Uzbekistan',
  '402042': 'TBC Bank Uzbekistan',
  '414708': 'Hamkorbank',
  '414709': 'Hamkorbank',
  '426076': 'Asaka Bank',
  '426077': 'Asaka Bank',
  '427022': 'Kapitalbank',
  '427023': 'Kapitalbank',
  '427218': 'Ipoteka Bank',
  '427219': 'Ipoteka Bank',
  '438819': 'Xalq Bank',
  '438820': 'Xalq Bank',
  '453760': 'Agrobank',
  '453761': 'Agrobank',
  '461864': 'Orient Finans Bank',
  '461865': 'Orient Finans Bank',
  '462244': 'Aloqabank',
  '462245': 'Aloqabank',
  '472198': 'SQB',
  '472199': 'SQB',
  '479415': 'Milliy Bank',
  '479416': 'Milliy Bank',
  '486445': 'Hamkorbank',
  '486446': 'Hamkorbank',
  '489637': 'Anorbank',
  '489638': 'Anorbank',
  '492182': 'Uzum Bank',
  '492183': 'Uzum Bank',

  // ── MASTERCARD — карты узбекских банков ──────────────────────
  '512735': 'TBC Bank Uzbekistan',
  '512736': 'TBC Bank Uzbekistan',
  '516736': 'Kapitalbank',
  '516737': 'Kapitalbank',
  '520218': 'Xalq Bank',
  '520219': 'Xalq Bank',
  '521204': 'Ipoteka Bank',
  '521205': 'Ipoteka Bank',
  '522620': 'Asaka Bank',
  '522621': 'Asaka Bank',
  '524063': 'Milliy Bank',
  '524064': 'Milliy Bank',
  '540780': 'Agrobank',
  '540781': 'Agrobank',
  '543215': 'Davr Bank',
  '543216': 'Davr Bank',
  '553620': 'Hamkorbank',
  '553621': 'Hamkorbank',
  '558080': 'Orient Finans Bank',
  '558081': 'Orient Finans Bank',
  '561401': 'Aloqabank',
  '561402': 'Aloqabank',
  '566282': 'Anorbank',
  '566283': 'Anorbank',
  '529537': 'Uzum Bank',
  '529538': 'Uzum Bank',

  // ── Bank of Recreate by Wizbort (BIN-префикс 1234) ───────────
  '123400': 'Bank of Recreate by Wizbort',
  '123401': 'Bank of Recreate by Wizbort',
  '123402': 'Bank of Recreate by Wizbort',
  '123403': 'Bank of Recreate by Wizbort',
  '123404': 'Bank of Recreate by Wizbort',
  '123405': 'Bank of Recreate by Wizbort',
  '123406': 'Bank of Recreate by Wizbort',
  '123407': 'Bank of Recreate by Wizbort',
  '123408': 'Bank of Recreate by Wizbort',
  '123409': 'Bank of Recreate by Wizbort',
}

/** 4-значные префиксы, которые однозначно указывают на банк без уточнения 5-6 цифр. */
const UZ_BANK_BIN4_MAP = {
  '1234': 'Bank of Recreate by Wizbort',
}

/**
 * Определяет название банка-эмитента по первым 6 (или 4) цифрам карты.
 * Возвращает null, если банк не найден в справочнике.
 */
export function getBankNameFromBin(digits) {
  const d = String(digits).replace(/\D/g, '')
  if (d.length < 6) return null
  const hit6 = UZ_BANK_BIN_MAP[d.slice(0, 6)]
  if (hit6) return hit6
  const hit4 = UZ_BANK_BIN4_MAP[d.slice(0, 4)]
  if (hit4) return hit4
  return null
}

/** Платёжная система по первым 4 цифрам номера карты (упрощённые правила BIN). */
export function getProcessingSystemFromFirstFour(digits) {
  const f = String(digits).replace(/\D/g, '').slice(0, 4)
  if (f.length < 4) {
    return null
  }
  const n = parseInt(f, 10)
  if (f === '8600' || f === '5614') {
    return 'UZCARD'
  }
  if (f === '1234') {
    return 'UZCARD'
  }
  if (f[0] === '4') {
    return 'VISA'
  }
  if (n >= 2221 && n <= 2720) {
    return 'MASTERCARD'
  }
  if (n >= 5100 && n <= 5599) {
    return 'MASTERCARD'
  }
  if (f === '9860') {
    return 'HUMO'
  }
  return null
}

/** Нужен ли CVV/CVC при привязке карты (HUMO и UZCARD — без CVV). */
export function processingSystemRequiresCvv(system) {
  if (!system) return false
  return ['VISA', 'MASTERCARD'].includes(system)
}

/** null если срок корректен и не истёк; иначе текст ошибки для формы. */
export function getCardExpiryIssue(expiryRaw) {
  const s = String(expiryRaw).trim()
  const m = s.match(/^(\d{1,2})\s*[/\-.]\s*(\d{2}|\d{4})$/)
  if (!m) {
    return 'Укажите срок в формате ММ/ГГ'
  }
  let month = parseInt(m[1], 10)
  let year = parseInt(m[2], 10)
  if (m[2].length === 2) {
    year += 2000
  }
  if (month < 1 || month > 12) {
    return 'Некорректный месяц (от 01 до 12)'
  }
  const lastMs = new Date(year, month, 0, 23, 59, 59, 999).getTime()
  if (lastMs < Date.now()) {
    return 'Срок действия карты истёк. Укажите актуальную дату.'
  }
  return null
}

/** Срок MM/YY или MM/YYYY: карта действительна до конца указанного месяца включительно. */
export function isCardExpiryValid(expiryRaw) {
  return getCardExpiryIssue(expiryRaw) === null
}

export function randomUzsBalanceUpTo(maxUzs = 10_000_000) {
  const cents = Math.floor(Math.random() * (maxUzs * 100 + 1))
  return Math.round(cents) / 100
}
