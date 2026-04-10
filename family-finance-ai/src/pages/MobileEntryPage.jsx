import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import PreviewPage from './PreviewPage'
import { prefetchExchangeRates } from '../utils/exchangeRates'
import { getSanitizedReturnPath, isSessionUnlocked, unlockSession } from '../utils/sessionLock'

const REQUIRED_PIN_LENGTH = 4
const PIN_PAD_HIDE_DURATION_MS = 520
const HOME_NAVIGATION_DELAY_MS = 430
const PIN_PAD_RAISE_PX = 18

const PRELOAD_ASSET_URLS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCzomY-KZHnGFIadbKc02U3Cvh7q9lPWaxdiuXVi9REUBDvpGsEdLU5rOAKx3GGxIPm-bqIdtIuZcIELXyMjqHpwOOHKKLXn_-2NUtDqyU1DKm2Km8T229jVM2ca9xOs1Yu9C2NW30rRmRsEqfNT5ri7HwEIbtk8f4TdYWT0Yr2ReRzrMHfM2Lziq-e2-FAWh1hRQ57NTLE_nwTGWgK6_KvSM9cT1XD8EM1iS1oT7wbReo30_jLWzDqzViI0oQk-vVohRJXXP1AAOGe',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCZhfBPmpUxgKQVkWHJWcu0hNyljVYXGCXOeuz_j708scbDnHq3bS2Df0tBDxBvGPkosOcz2atW9fLr8p4ms9AajhRDZdSUodt_jfSNwqgSXkHJtruQXZtgkbQPp-8U3q9EBp_Wh-SYqdlDI6xJRxtDTpbhP4Gft44XwRBYeLK5EI7OJXWZDpE13y5zwjSkqtRDd6tzatPtYPW1TH01roAPtpWgd8u83riO1mKPl6suflWl4bTKkCJ5wPmUAbKZI_3RBWkzGImjdPL9',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDjJiY09UnaDDcguY3QFXXG9NajehRFEJ5389F3255qfRouKwtzbkqk49oi2Qohq2WgDcnwLoDIXprhT6oh7Ce9Z0xguHMniqC12yZo_fkpKKpnhSOZw9wdDs2b9VpSmZqQmswbrMZLKkIeA63e9ztEClytOFcYpMBOTFduZ6LTArpRb7vAWlAjRi12WJpctlhVZIGndzNvQmFXnejcKmwNpCoblIK5o-p2BzfzQHjqsgQhs1eeHt3Dk1Yag938GJZzQrsqVEEuOrRI',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuChARR0sk9sTUar-F2PdDXcWZ5lRh5uX7t9P294SRWvPkn0w8bb2lqs_758XBnSzz9Pdb3zzSuFCV9g7c2soddMAMba3uEGN7KrIih6_FJAq3UN2WquBGq942s5rPU0vLkasmEQ2K1hvtbIvB3WmqIC2ET_vYZVYendrA4HrE9MNfnFBSCVxVFPZ0MLiHkgCVIgH8N_hHMGBV2Gib6Z1fTbR2EzIrcIVzRTxj4gN4L3oK4dZiAsdfGHGnWBR2BEJHd-uBx25Zgh1Hz-'
]

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()

    const done = () => {
      img.onload = null
      img.onerror = null
      resolve()
    }

    img.onload = done
    img.onerror = done
    img.src = src

    if (img.complete) {
      done()
    }
  })
}

function PinDot({ filled }) {
  return (
    <span
      className={`h-3 w-3 rounded-full border ${
        filled ? 'border-[#4cd6fb] bg-[#4cd6fb]' : 'border-[#869398] bg-transparent'
      }`}
    />
  )
}

function KeyButton({ children, onClick, muted = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-xl font-semibold ${
        disabled ? 'cursor-not-allowed opacity-45' : 'active:scale-95'
      } ${
        muted
          ? 'border-[#27354c] bg-[#0d1c32] text-[#bcc9ce]'
          : 'border-[#3d494d] bg-[#112036] text-[#d6e3ff]'
      }`}
    >
      {children}
    </button>
  )
}

export default function MobileEntryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isSiteReady, setIsSiteReady] = useState(false)
  const [pinCode, setPinCode] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const isPinComplete = pinCode.length >= REQUIRED_PIN_LENGTH
  const returnToPath = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return getSanitizedReturnPath(params.get('returnTo'))
  }, [location.search])

  useEffect(() => {
    if (isSessionUnlocked()) {
      navigate(returnToPath, { replace: true, state: { unlocked: true } })
    }
  }, [navigate, returnToPath])

  useEffect(() => {
    if (!isSiteReady) {
      return
    }

    prefetchExchangeRates().catch(() => undefined)
  }, [isSiteReady])

  useEffect(() => {
    let isCancelled = false

    const ensureWindowLoaded = () => {
      if (document.readyState === 'complete') {
        return Promise.resolve()
      }

      return new Promise((resolve) => {
        window.addEventListener('load', resolve, { once: true })
      })
    }

    const ensureFontsLoaded = () => {
      if (!document.fonts || !document.fonts.ready) {
        return Promise.resolve()
      }

      return document.fonts.ready.catch(() => undefined)
    }

    Promise.all([
      ensureWindowLoaded(),
      ensureFontsLoaded(),
      Promise.all(PRELOAD_ASSET_URLS.map((assetUrl) => preloadImage(assetUrl))),
    ]).then(() => {
      if (!isCancelled) {
        setIsSiteReady(true)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isUnlocking) {
      return
    }

    const redirectTimer = setTimeout(() => {
      navigate(returnToPath, { replace: true, state: { unlocked: true } })
    }, HOME_NAVIGATION_DELAY_MS)

    return () => {
      clearTimeout(redirectTimer)
    }
  }, [isUnlocking, navigate, returnToPath])

  const handleDigit = useCallback(
    (digit) => {
      if (!isSiteReady || isUnlocking) {
        return
      }

      if (pinCode.length >= REQUIRED_PIN_LENGTH) {
        return
      }

      const nextPin = `${pinCode}${digit}`
      setPinCode(nextPin)

      if (nextPin.length === REQUIRED_PIN_LENGTH) {
        unlockSession()
        setIsUnlocking(true)
      }
    },
    [isSiteReady, isUnlocking, pinCode],
  )

  const handleBackspace = useCallback(() => {
    if (!isSiteReady || isUnlocking) {
      return
    }

    setPinCode((previous) => previous.slice(0, -1))
  }, [isSiteReady, isUnlocking])

  const keys = useMemo(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9'], [])

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <PreviewPage />

      {!isSiteReady ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-end pb-44">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#4cd6fb]/30 border-t-[#4cd6fb]" />
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#bcc9ce]">Загрузка защищенного экрана...</p>
        </div>
      ) : null}

      {isSiteReady ? (
        <>
          <div
            className={`pointer-events-none absolute inset-0 z-20 ${
              isUnlocking ? 'bg-[#041329]/20' : 'bg-[#041329]/45'
            }`}
          />

          <section
            className={`absolute inset-x-0 bottom-0 z-30 rounded-t-[32px] border-t border-[#3d494d] bg-[#010e24]/96 px-6 pb-8 pt-5 shadow-[0_-12px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 ${
              isUnlocking ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
            }`}
            style={{
              transitionDuration: `${PIN_PAD_HIDE_DURATION_MS}ms`,
              transitionTimingFunction: 'cubic-bezier(0.5, 0, 1, 1)',
              bottom: `${PIN_PAD_RAISE_PX}px`,
            }}
          >
            <div className="mx-auto w-full max-w-[380px]">
              <div className="mb-5">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#4cd6fb]/40 bg-[#4cd6fb]/15">
                      <span className="material-symbols-outlined text-[30px] text-[#4cd6fb]">
                        {isPinComplete ? 'lock_open' : 'lock'}
                      </span>
                  </div>
                </div>

                <div className="text-center">
                  <h2 className="font-headline text-lg font-bold text-[#d6e3ff]">Подтверждение входа</h2>
                  <p className="text-sm text-[#bcc9ce]">Введите 4 цифры</p>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-center gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <PinDot key={index} filled={index < pinCode.length} />
                ))}
              </div>

              <div className="mb-5 flex min-h-20 items-center justify-center">
                <p className="text-xs uppercase tracking-[0.2em] text-[#869398]">Mobile Secure Login</p>
              </div>

              <div className="grid grid-cols-3 justify-items-center gap-y-3">
                {keys.map((digit) => (
                    <KeyButton
                      key={digit}
                      disabled={isUnlocking || isPinComplete}
                      onClick={() => handleDigit(digit)}
                    >
                    {digit}
                  </KeyButton>
                ))}

                  <div aria-hidden="true" className="h-16 w-16" />

                  <KeyButton disabled={isUnlocking || isPinComplete} onClick={() => handleDigit('0')}>
                    0
                  </KeyButton>

                  <KeyButton disabled={isUnlocking || isPinComplete} muted onClick={handleBackspace}>
                  <span className="material-symbols-outlined text-[22px]">backspace</span>
                </KeyButton>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
