import { useNavigate } from 'react-router-dom'

/** Круг и крестик по визуальному весу рядом с заголовком `text-3xl font-extrabold`. */
export const SUBPAGE_CLOSE_BUTTON_CLASS =
  'flex h-12 w-12 min-h-12 min-w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#4cd6fb]/55 bg-[#112036] text-[#d6e3ff] shadow-[0_0_0_1px_rgba(76,214,251,0.15),0_4px_16px_rgba(76,214,251,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-[#58d6f1] hover:bg-[#1c2a41] hover:shadow-[0_0_0_1px_rgba(88,214,241,0.3),0_6px_22px_rgba(76,214,251,0.32)] active:scale-95 sm:h-[3.25rem] sm:w-[3.25rem] sm:min-h-[3.25rem] sm:min-w-[3.25rem]'

export default function SubpageCloseButton({
  to = '/monitoring',
  ariaLabel = 'Закрыть и вернуться к мониторингу',
  /** Если задано, вызывается вместо перехода по маршруту `to`. */
  onClose,
}) {
  const navigate = useNavigate()

  return (
    <button
      aria-label={ariaLabel}
      className={SUBPAGE_CLOSE_BUTTON_CLASS}
      type="button"
      onClick={() => (onClose ? onClose() : navigate(to))}
    >
      <span
        className="material-symbols-outlined leading-none text-[#4cd6fb]"
        style={{
          fontSize: 'clamp(1.625rem, 4.2vw, 1.875rem)',
          fontVariationSettings: '"FILL" 0, "wght" 600',
        }}
      >
        close
      </span>
    </button>
  )
}
