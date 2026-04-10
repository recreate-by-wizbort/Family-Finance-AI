const CBU_RATES_API_URL = 'https://cbu.uz/ru/arkhiv-kursov-valyut/json/'
const EXCHANGE_RATES_CACHE_KEY = 'family-finance-exchange-rates-v1'
const EXCHANGE_RATES_TTL_MS = 30 * 60 * 1000

const FALLBACK_RATES = {
  USD: { ccy: 'USD', rate: 12198, diff: -30.3 },
  EUR: { ccy: 'EUR', rate: 13220, diff: -21.7 },
}

let inFlightRatesRequest = null

function parseApiNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.replace(/\s+/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function readRatesCache() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(EXCHANGE_RATES_CACHE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.expiresAt !== 'number' || !parsed.rates) {
      return null
    }

    if (parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(EXCHANGE_RATES_CACHE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeRatesCache(rates) {
  if (typeof window === 'undefined') {
    return
  }

  const now = Date.now()
  const payload = {
    fetchedAt: now,
    expiresAt: now + EXCHANGE_RATES_TTL_MS,
    rates,
  }

  window.localStorage.setItem(EXCHANGE_RATES_CACHE_KEY, JSON.stringify(payload))
}

function formatRateEntry(entry, fallbackEntry) {
  const rawRate = parseApiNumber(entry?.Rate)
  const roundedRate = rawRate == null ? fallbackEntry.rate : Math.round(rawRate)

  const rawDiff = parseApiNumber(entry?.Diff)
  const normalizedDiff = rawDiff == null ? fallbackEntry.diff : Number(rawDiff.toFixed(1))

  return {
    ccy: entry?.Ccy ?? fallbackEntry.ccy,
    rate: roundedRate,
    diff: normalizedDiff,
  }
}

function buildRatesFromApiResponse(responseData) {
  if (!Array.isArray(responseData)) {
    return FALLBACK_RATES
  }

  const usdEntry = responseData.find((item) => item?.Ccy === 'USD')
  const eurEntry = responseData.find((item) => item?.Ccy === 'EUR')

  return {
    USD: formatRateEntry(usdEntry, FALLBACK_RATES.USD),
    EUR: formatRateEntry(eurEntry, FALLBACK_RATES.EUR),
  }
}

async function requestRatesFromApi() {
  const response = await fetch(CBU_RATES_API_URL)
  if (!response.ok) {
    throw new Error(`Exchange rates API error: ${response.status}`)
  }

  const data = await response.json()
  return buildRatesFromApiResponse(data)
}

export function getCachedExchangeRates() {
  return readRatesCache()
}

export function getFallbackExchangeRates() {
  return FALLBACK_RATES
}

export async function getExchangeRates() {
  const cached = readRatesCache()
  if (cached) {
    return cached
  }

  if (inFlightRatesRequest) {
    return inFlightRatesRequest
  }

  inFlightRatesRequest = requestRatesFromApi()
    .then((rates) => {
      writeRatesCache(rates)
      return {
        fetchedAt: Date.now(),
        expiresAt: Date.now() + EXCHANGE_RATES_TTL_MS,
        rates,
      }
    })
    .catch(() => {
      const fallbackPayload = {
        fetchedAt: Date.now(),
        expiresAt: Date.now() + EXCHANGE_RATES_TTL_MS,
        rates: FALLBACK_RATES,
      }

      writeRatesCache(fallbackPayload.rates)
      return fallbackPayload
    })
    .finally(() => {
      inFlightRatesRequest = null
    })

  return inFlightRatesRequest
}

export function prefetchExchangeRates() {
  return getExchangeRates().then(() => undefined)
}

export { CBU_RATES_API_URL, EXCHANGE_RATES_TTL_MS }
