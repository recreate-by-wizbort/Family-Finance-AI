const ACCOUNTS_STORAGE_KEY = 'family-finance-accounts-v1'

export const ACCOUNT_CURRENCIES = ['UZS', 'USD', 'EUR']

export const ACCOUNT_MIN_AMOUNTS = {
  UZS: 0,
  USD: 0,
  EUR: 0,
}

/** 16 цифр — отображается как номер счёта (как PAN). */
export function generateAccountNumberDigits() {
  let s = ''
  for (let i = 0; i < 16; i += 1) {
    s += Math.floor(Math.random() * 10)
  }
  return s
}

export function loadUserAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    let mutated = false
    const fixed = list.map((a) => {
      const next = { ...a }
      if (!String(next.label ?? '').trim()) {
        next.label = 'Счёт'
        mutated = true
      }
      const digits = String(next.accountNumber ?? '').replace(/\D/g, '')
      if (digits.length < 12) {
        next.accountNumber = generateAccountNumberDigits()
        mutated = true
      }
      return next
    })
    if (mutated) saveUserAccounts(fixed)
    return fixed
  } catch {
    return []
  }
}

export function saveUserAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
}

export function createAccount({ label, currency, amount, cardId, accountNumber }) {
  const now = new Date()
  const digits = accountNumber && String(accountNumber).replace(/\D/g, '').length >= 12
    ? String(accountNumber).replace(/\D/g, '').slice(0, 20)
    : generateAccountNumberDigits()
  return {
    id: `uacc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: String(label ?? '').trim() || 'Счёт',
    accountNumber: digits,
    currency,
    amount,
    initialAmount: amount,
    openedAt: now.toISOString(),
    cardId,
    history: [
      { type: 'open', amount, date: now.toISOString(), cardId },
    ],
  }
}

export function topUpAccount(account, amount, cardId) {
  return {
    ...account,
    amount: account.amount + amount,
    history: [
      ...account.history,
      { type: 'topup', amount, date: new Date().toISOString(), cardId },
    ],
  }
}

export function withdrawFromAccount(account, amount, cardId) {
  const withdrawAmount = Math.min(amount, account.amount)
  return {
    ...account,
    amount: account.amount - withdrawAmount,
    history: [
      ...account.history,
      { type: 'withdraw', amount: withdrawAmount, date: new Date().toISOString(), cardId },
    ],
  }
}
