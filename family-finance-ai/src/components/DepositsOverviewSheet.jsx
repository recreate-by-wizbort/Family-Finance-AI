import { useCallback, useEffect, useState } from 'react'
import { formatDepositCurrency, getAccruedInterest, DEPOSIT_TERM_MONTHS } from '../utils/deposits'

export default function DepositsOverviewSheet({
  isOpen,
  onClose,
  deposits,
  isUnlocked,
  onSelectDeposit,
  onOpenNewDeposit,
}) {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) setIsClosing(false)
  }, [isOpen])

  const requestClose = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setIsClosing(true)
  }, [onClose])

  const handlePanelAnimEnd = (e) => {
    if (e.target !== e.currentTarget || !isClosing) return
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const h = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [isOpen, requestClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[125] flex flex-col justify-end sm:items-center sm:justify-center sm:p-4">
      <button
        aria-label="Закрыть"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${
          isClosing ? 'animate-sheet-backdrop-out' : 'animate-sheet-backdrop-in'
        }`}
        onClick={requestClose}
        type="button"
      />
      <div
        className={`relative z-10 flex h-[min(88dvh,760px)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-[#4cd6fb]/20 bg-[#071021] shadow-2xl sm:h-[min(88dvh,780px)] sm:max-w-lg sm:rounded-3xl ${
          isClosing ? 'animate-sheet-panel-out' : 'animate-sheet-panel-in'
        }`}
        onAnimationEnd={handlePanelAnimEnd}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposits-overview-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#1c2a41] px-5 py-4">
          <h2
            id="deposits-overview-title"
            className="font-headline text-lg font-bold text-[#d6e3ff]"
          >
            Мои вклады
          </h2>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#bcc9ce] hover:bg-[#112036] hover:text-[#4cd6fb]"
            onClick={requestClose}
            type="button"
            aria-label="Закрыть"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
          <p className="mb-4 text-xs text-[#5c6b73]">
            Срок по договору — {DEPOSIT_TERM_MONTHS} месяцев. Нажмите вклад, чтобы пополнить, снять
            средства или посмотреть историю.
          </p>

          <ul className="space-y-3">
            {deposits.map((dep) => {
              const accrued = getAccruedInterest(dep)
              return (
                <li key={dep.id}>
                  <button
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#1c2a41] bg-[#112036] px-4 py-4 text-left transition-colors hover:border-[#4cd6fb]/35 hover:bg-[#172a44]"
                    onClick={() => onSelectDeposit(dep)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#d6e3ff]">
                        {dep.currency} · {dep.rate}% годовых
                      </p>
                      <p className="mt-0.5 text-xs text-[#5c6b73]">
                        {dep.withdrawable
                          ? 'С пополнением и снятием'
                          : 'Без досрочного снятия'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold tabular-nums text-[#d6e3ff]">
                        {isUnlocked
                          ? formatDepositCurrency(dep.amount, dep.currency)
                          : `•••• ${dep.currency}`}
                      </p>
                      {isUnlocked && accrued > 0 ? (
                        <p className="mt-0.5 text-xs font-semibold text-[#58d6f1]">
                          +{formatDepositCurrency(accrued, dep.currency)}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#4cd6fb]/40 bg-[#112036]/50 py-3.5 text-sm font-bold text-[#4cd6fb] transition-colors hover:border-[#4cd6fb]/60 hover:bg-[#112036]"
            onClick={onOpenNewDeposit}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Открыть новый вклад
          </button>
        </div>
      </div>
    </div>
  )
}
