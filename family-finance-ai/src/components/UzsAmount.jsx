import { formatUzsGroupedRu, formatUzsShortRu, parseUzsAmountString } from '../utils.js'

/** UZS справа от суммы: тот же baseline, что у цифр и «млн» (inline-flex + items-baseline). */
const CURRENCY_SUFFIX_BASELINE_DEFAULT =
  'relative -top-[0.03em] shrink-0 align-baseline text-[0.6em] font-semibold uppercase leading-none tracking-[0.12em] text-[#9fb2c4]'

/** Для полей ввода и подписей вне компонента — тот же визуальный стиль, что у суффикса в `UzsAmount`. */
export const UZS_AMOUNT_SUFFIX_CLASS = CURRENCY_SUFFIX_BASELINE_DEFAULT

/** UZS в одной строке с суммой: по базовой линии (нижний край текста, уровень «млн»), не под центром блока */
const CURRENCY_INLINE_BASELINE_DEFAULT =
  'relative -top-[0.03em] inline-block shrink-0 align-baseline text-[0.6em] font-semibold uppercase leading-none tracking-[0.12em] text-[#9fb2c4]'

const CURRENCY_UNIT_LINKED_BASELINE_DEFAULT =
  'shrink-0 align-baseline font-semibold uppercase leading-none tracking-[0.12em] text-[#9fb2c4]'

/** UZS относительно кегля «млн» / «млрд» / «тыс» в режиме `linkCurrencyToUnit`. */
const CURRENCY_UNIT_UZS_EM = 0.6

/** «12,3 млн» → число и единица отдельно (UZS визуально к кеглю «млн»). */
function splitShortRuAmountParts(main) {
  const s = String(main).trimEnd()
  const m = s.match(/^(.+?)\s+(млн|млрд|тыс)$/)
  if (!m) return null
  return { head: m[1], unit: m[2] }
}

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
  linkCurrencyToUnit = false,
  /** Только при `linkCurrencyToUnit`: зазоры «цифры–единица» и «единица–UZS». */
  linkCurrencySpacing = 'pill',
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
  const shortParts = linkCurrencyToUnit ? splitShortRuAmountParts(main) : null

  /** Минимальный зазор между цифрами и «млн» / «млрд» / «тыс». */
  const headToUnitGap = 'gap-x-px'
  /** `pill` — шире между единицей и UZS (плашки «Затраты»); `inline` — плотнее (строки категорий). */
  const unitToUzsGap = linkCurrencySpacing === 'inline' ? 'gap-x-0.5' : 'gap-x-2'

  if (currencyPlacement === 'below') {
    const curCls = [
      linkCurrencyToUnit ? CURRENCY_UNIT_LINKED_BASELINE_DEFAULT : CURRENCY_INLINE_BASELINE_DEFAULT,
      currencyClassName,
    ]
      .filter(Boolean)
      .join(' ')

    if (shortParts != null) {
      return (
        <Tag className={className}>
          <span
            className={`inline-flex max-w-full min-w-0 flex-nowrap items-baseline justify-end ${headToUnitGap} ${amountClass}`}
          >
            <span className="tabular-nums whitespace-nowrap">{shortParts.head}</span>
            <span className={`inline-flex items-baseline whitespace-nowrap ${unitToUzsGap}`}>
              <span className="tabular-nums whitespace-nowrap">{shortParts.unit}</span>
              <span className={curCls} style={{ fontSize: `${CURRENCY_UNIT_UZS_EM}em` }}>
                UZS
              </span>
            </span>
          </span>
        </Tag>
      )
    }

    return (
      <Tag className={className}>
        <span className="inline-flex flex-row flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0">
          <span className={amountClass}>{main}</span>
          <span className={curCls}>UZS</span>
        </span>
      </Tag>
    )
  }

  const curCls = [
    linkCurrencyToUnit ? CURRENCY_UNIT_LINKED_BASELINE_DEFAULT : CURRENCY_SUFFIX_BASELINE_DEFAULT,
    currencyClassName,
  ]
    .filter(Boolean)
    .join(' ')

  if (shortParts != null) {
    return (
      <Tag className={className}>
        <span
          className={`inline-flex max-w-full min-w-0 flex-nowrap items-baseline ${headToUnitGap} ${amountClass}`}
        >
          <span className="tabular-nums whitespace-nowrap">{shortParts.head}</span>
          <span className={`inline-flex items-baseline whitespace-nowrap ${unitToUzsGap}`}>
            <span className="tabular-nums whitespace-nowrap">{shortParts.unit}</span>
            <span className={curCls} style={{ fontSize: `${CURRENCY_UNIT_UZS_EM}em` }}>
              UZS
            </span>
          </span>
        </span>
      </Tag>
    )
  }

  return (
    <Tag className={className}>
      <span className="inline-flex max-w-full flex-row flex-wrap items-baseline gap-x-1.5">
        <span className={amountClass}>{main}</span>
        <span className={curCls}>UZS</span>
      </span>
    </Tag>
  )
}
