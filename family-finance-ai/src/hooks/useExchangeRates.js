import { useEffect, useState } from 'react'
import {
  getCachedExchangeRates,
  getExchangeRates,
  getFallbackExchangeRates,
} from '../utils/exchangeRates'

export default function useExchangeRates() {
  const [rates, setRates] = useState(() => {
    const cached = getCachedExchangeRates()
    return cached?.rates ?? getFallbackExchangeRates()
  })

  useEffect(() => {
    let isCancelled = false

    getExchangeRates().then((payload) => {
      if (!isCancelled) {
        setRates(payload.rates)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [])

  return rates
}
