const ACCOUNTS_STORAGE_KEY = 'family-finance-accounts-v1'

export const ACCOUNT_CURRENCIES = ['UZS', 'USD', 'EUR']

export const ACCOUNT_MIN_AMOUNTS = {
  UZS: 0,
  USD: 0,
  EUR: 0,
}

export function loadUserAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveUserAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
}

export function createAccount({ currency, amount, cardId }) {
  const now = new Date()
  return {
    id: `uacc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
