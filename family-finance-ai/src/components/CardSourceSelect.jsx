import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatSelectBalanceClosed, formatSelectBalanceFull } from '../utils/balanceDisplay'

export default function CardSourceSelect({
  cards,
  value,
  onChange,
  /** Если вернёт true — пункт только для отображения, выбрать нельзя. */
  isOptionDisabled,
  /** Подпись под недоступным пунктом (например, микрозайм только в UZS). */
  disabledOptionHint,
  label = 'Карта списания',
  labelClassName = 'mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]',
  className = 'mb-5',
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const rootRef = useRef(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  const selected = useMemo(() => {
    const dis = isOptionDisabled ?? (() => false)
    const ok = (c) => !dis(c)
    const match = cards.find((c) => c.id === value && ok(c))
    if (match) return match
    const firstOk = cards.find(ok)
    if (firstOk) return firstOk
    return cards[0]
  }, [cards, value, isOptionDisabled])

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setMenuPos(null)
      return
    }
    const update = () => {
      if (!btnRef.current) return
      const r = btnRef.current.getBoundingClientRect()
      const vv = window.visualViewport
      const vh = vv?.height ?? window.innerHeight
      const vw = vv?.width ?? window.innerWidth
      const gap = 6
      const spaceBelow = vh - r.bottom - gap
      const spaceAbove = r.top - gap
      const minMenu = 96
      const idealMax = 320
      const dis = isOptionDisabled ?? (() => false)
      const hasHint = Boolean(disabledOptionHint)
      const contentNeed = cards.reduce(
        (sum, c) => sum + (dis(c) && hasHint ? 72 : 50),
        0,
      ) + 10
      const approxH = Math.min(idealMax, Math.max(minMenu, contentNeed))
      const openUpward = spaceBelow < Math.min(approxH, 200) && spaceAbove > spaceBelow + 16

      const left = Math.min(Math.max(8, Math.round(r.left)), Math.max(8, vw - Math.round(r.width) - 8))
      const width = Math.max(0, Math.round(r.width))

      const capDown = Math.max(minMenu, Math.min(idealMax, spaceBelow - 10, contentNeed))
      const capUp = Math.max(minMenu, Math.min(idealMax, spaceAbove - 10, contentNeed))

      if (openUpward) {
        setMenuPos({
          openUpward: true,
          bottom: Math.round(vh - r.top + gap),
          left,
          width,
          maxHeight: capUp,
        })
      } else {
        setMenuPos({
          openUpward: false,
          top: Math.round(r.bottom + gap),
          left,
          width,
          maxHeight: capDown,
        })
      }
    }
    update()
    const raf = requestAnimationFrame(() => {
      update()
    })
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [open, cards, cards.length, disabledOptionHint, isOptionDisabled])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      const t = e.target
      if (rootRef.current?.contains(t)) return
      if (menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!cards.length) return null

  const closedLine = selected
    ? `${selected.sheetTitle} · ${selected.last4} · ${formatSelectBalanceClosed(selected)}`
    : ''

  const menuEl =
    open && menuPos && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={menuRef}
            className="fixed z-[9999] overflow-y-auto overscroll-contain rounded-xl border border-[#1c2a41] bg-[#0d1c32] py-1 shadow-2xl"
            role="listbox"
            style={{
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
              ...(menuPos.openUpward
                ? { bottom: menuPos.bottom, top: 'auto' }
                : { top: menuPos.top, bottom: 'auto' }),
            }}
          >
            {cards.map((c) => {
              const active = c.id === (value || selected?.id)
              const disabled = Boolean(isOptionDisabled?.(c))
              const mainLine = `${c.sheetTitle} · ${c.last4} · ${formatSelectBalanceFull(c)}`
              return (
                <li key={c.id} role="option" aria-selected={active} aria-disabled={disabled}>
                  <button
                    type="button"
                    disabled={disabled}
                    className={`flex w-full flex-col items-stretch px-4 py-3.5 text-left transition-colors disabled:pointer-events-none disabled:opacity-45 ${
                      active
                        ? 'bg-[#4cd6fb]/12 text-[#d6e3ff]'
                        : 'text-[#d6e3ff] hover:bg-[#112036]'
                    }`}
                    onClick={() => {
                      if (disabled) return
                      onChange(c.id)
                      setOpen(false)
                    }}
                  >
                    <span className="text-sm font-medium leading-snug text-[#d6e3ff]">{mainLine}</span>
                    {disabled && disabledOptionHint ? (
                      <span className="mt-1.5 text-[11px] font-normal normal-case leading-snug tracking-normal text-[#8fa3b0]">
                        {disabledOptionHint}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? <p className={labelClassName}>{label}</p> : null}
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="relative flex w-full items-center gap-2 rounded-xl border border-[#4cd6fb]/35 bg-[#112036] py-3 pl-4 pr-11 text-left text-sm leading-snug text-[#d6e3ff] outline-none transition-colors hover:border-[#4cd6fb]/55 focus-visible:ring-2 focus-visible:ring-[#4cd6fb]/40"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1 truncate font-medium">{closedLine}</span>
        <span className="pointer-events-none absolute right-3 top-2.5 text-[#4cd6fb]">
          <span
            className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </span>
      </button>
      {menuEl}
    </div>
  )
}
