import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatSelectBalanceClosed, formatSelectBalanceFull } from '../utils/balanceDisplay'

export default function CardSourceSelect({
  cards,
  value,
  onChange,
  label = 'Карта списания',
  labelClassName = 'mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bcc9ce]',
  className = 'mb-5',
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const rootRef = useRef(null)
  const btnRef = useRef(null)

  const selected = useMemo(
    () => cards.find((c) => c.id === value) ?? cards[0],
    [cards, value],
  )

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setMenuPos(null)
      return
    }
    const update = () => {
      const r = btnRef.current.getBoundingClientRect()
      setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!cards.length) return null

  const closedLine = selected
    ? `${selected.sheetTitle} · •••• ${selected.last4} · ${formatSelectBalanceClosed(selected)}`
    : ''

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? <p className={labelClassName}>{label}</p> : null}
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="relative flex w-full items-center gap-2 rounded-xl border border-[#4cd6fb]/35 bg-[#112036] py-3 pl-4 pr-10 text-left text-sm text-[#d6e3ff] outline-none transition-colors hover:border-[#4cd6fb]/55 focus-visible:ring-2 focus-visible:ring-[#4cd6fb]/40"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1 truncate font-medium">{closedLine}</span>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4cd6fb]">
          <span
            className={`material-symbols-outlined text-[22px] transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </span>
      </button>

      {open && menuPos ? (
        <ul
          className="fixed z-[140] max-h-[min(52vh,320px)] overflow-y-auto rounded-xl border border-[#1c2a41] bg-[#0d1c32] py-1 shadow-2xl"
          role="listbox"
          style={{
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
          }}
        >
          {cards.map((c) => {
            const active = c.id === (value || selected?.id)
            const fullLine = `${c.sheetTitle} · •••• ${c.last4} · ${formatSelectBalanceFull(c)}`
            return (
              <li key={c.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`flex w-full px-4 py-3 text-left text-sm transition-colors ${
                    active
                      ? 'bg-[#4cd6fb]/12 text-[#d6e3ff]'
                      : 'text-[#d6e3ff] hover:bg-[#112036]'
                  }`}
                  onClick={() => {
                    onChange(c.id)
                    setOpen(false)
                  }}
                >
                  <span className="line-clamp-2 break-words font-medium">{fullLine}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
