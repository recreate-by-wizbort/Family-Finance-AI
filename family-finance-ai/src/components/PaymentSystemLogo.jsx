const STYLES = {
  HUMO: 'bg-gradient-to-br from-[#c41e1e] to-[#e85d04] text-white shadow-inner',
  UZCARD: 'bg-gradient-to-br from-[#0c4a6e] to-[#0369a1] text-white shadow-inner',
  VISA: 'bg-gradient-to-br from-[#1a1f71] to-[#2d3494] text-white shadow-inner',
  MASTERCARD: 'bg-gradient-to-br from-[#eb001b] to-[#f79e1b] text-white shadow-inner',
  DEFAULT: 'bg-[#1c2a41] text-[#4cd6fb]',
}

const SHORT = {
  UZCARD: 'UZC',
  MASTERCARD: 'MC',
}

export default function PaymentSystemLogo({ system, className = '' }) {
  const key = String(system || '')
    .toUpperCase()
    .replace(/\s+/g, '')
  const style = STYLES[key] ?? STYLES.DEFAULT
  const label = SHORT[key] ?? key

  return (
    <div
      aria-hidden
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold leading-none tracking-tight ${style} ${className}`}
    >
      <span className="max-w-[2.75rem] text-center leading-tight">{label}</span>
    </div>
  )
}
