const KEY = 'family-finance-deposit-card-movements-v1'

export function loadDepositCardMovements() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const p = JSON.parse(raw)
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

export function saveDepositCardMovements(byCardId) {
  localStorage.setItem(KEY, JSON.stringify(byCardId))
}

export function appendDepositCardMovement(prevByCardId, cardId, movement) {
  const next = { ...prevByCardId }
  const list = [...(next[cardId] ?? []), movement]
  next[cardId] = list
  saveDepositCardMovements(next)
  return next
}

export function buildDepositOutMovement(card, amountInCardCurrency, description, merchant = 'Вклад') {
  const id = `dcm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const ts = new Date().toISOString()
  if (card.foreignCurrency) {
    return {
      id,
      timestamp: ts,
      direction: 'out',
      amountForeign: Math.round(amountInCardCurrency * 100) / 100,
      currency: card.foreignCurrency,
      merchant,
      description,
    }
  }
  return {
    id,
    timestamp: ts,
    direction: 'out',
    amountUzs: Math.round(amountInCardCurrency * 100) / 100,
    merchant,
    description,
  }
}

export function buildDepositInMovement(card, amountInCardCurrency, description) {
  const id = `dcm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const ts = new Date().toISOString()
  if (card.foreignCurrency) {
    return {
      id,
      timestamp: ts,
      direction: 'in',
      amountForeign: Math.round(amountInCardCurrency * 100) / 100,
      currency: card.foreignCurrency,
      merchant: 'Вклад',
      description,
    }
  }
  return {
    id,
    timestamp: ts,
    direction: 'in',
    amountUzs: Math.round(amountInCardCurrency * 100) / 100,
    merchant: 'Вклад',
    description,
  }
}
