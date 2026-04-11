import { formatUzsGroupedRu, formatUzsShortRu, parseUzsAmountString } from '../utils.js'

const CURRENCY_SUFFIX_CLASS =
  'ml-1 inline-block shrink-0 text-[0.5em] font-semibold uppercase tracking-wide align-[0.16em]'

/** UZS в одной строке с суммой: по базовой линии (нижний край текста, уровень «млн»), не под центром блока */
const CURRENCY_INLINE_BASELINE_DEFAULT =
  'inline-block shrink-0 align-baseline text-[0.42em] font-semibold uppercase leading-none tracking-[0.12em] text-[#9fb2c4]'

export default function UzsAmount({
  value,
  as = 'span',
  className = '',
  compact = false,
  compactFrom = 1_000_000,
  /**
   * 'suffix' — UZS справа в строке (как надстрочный кегль).
   * 'below' — UZS сразу после суммы, на одной линии, по нижней кромке текста (baseline), рядом с «млн».
   */
  currencyPlacement = 'suffix',
  currencyClassName,
}) {
  const Tag = as
  const stripped = String(value).replace(/\s*(₽|UZS)\s*$/i, '').trim()
  const parsed = parseUzsAmountString(stripped)

  let main = stripped
  if (parsed.type === 'number') {
    const abs = Math.abs(parsed.value)
    const useShort = compact && abs >= compactFrom
    main = useShort ? formatUzsShortRu(parsed.value) : formatUzsGroupedRu(parsed.value)
  } else if (parsed.type === 'masked') {
    main = parsed.display
  }

  const amountClass = compact ? 'whitespace-nowrap tabular-nums' : 'tabular-nums'

  if (currencyPlacement === 'below') {
    const curCls = [CURRENCY_INLINE_BASELINE_DEFAULT, currencyClassName].filter(Boolean).join(' ')
    return (
      <Tag className={className}>
        <span className="inline-flex flex-row flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0">
          <span className={amountClass}>{main}</span>
          <span className={curCls}>UZS</span>
        </span>
      </Tag>
    )
  }

  const curCls = [CURRENCY_SUFFIX_CLASS, currencyClassName].filter(Boolean).join(' ')

  return (
    <Tag className={className}>
      <span className={amountClass}>{main}</span>
      <span className={curCls}>UZS</span>
    </Tag>
  )
}
