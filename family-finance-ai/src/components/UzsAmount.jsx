export default function UzsAmount({
  value,
  as = 'span',
  className = '',
  currencyClassName = 'ml-1 inline-block text-[0.5em] font-semibold uppercase tracking-wide align-[0.16em]',
}) {
  const Tag = as
  const normalizedValue = String(value).replace(/\s*(₽|UZS)\s*$/i, '').trim()

  return (
    <Tag className={className}>
      <span>{normalizedValue}</span>
      <span className={currencyClassName}>UZS</span>
    </Tag>
  )
}
