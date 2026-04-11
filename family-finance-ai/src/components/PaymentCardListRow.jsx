import PaymentSystemLogo from './PaymentSystemLogo'
import UzsAmount from './UzsAmount'

function formatForeignAmount(amount) {
  return Number(amount)
    .toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(',', '.')
}

export default function PaymentCardListRow({ formatBalance, isUnlocked, item, onSelect, isPrimary }) {
  const isForeign = item.foreignCurrency && item.balanceForeign != null
  return (
    <li className="list-none">
      <button
        className="flex w-full items-center gap-3 rounded-2xl bg-[#112036] py-3 pl-3 pr-2 text-left transition-colors hover:bg-[#1a2d45] active:scale-[0.995]"
        onClick={() => onSelect(item)}
        type="button"
      >
        {item.kind === 'account' ? (
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1c2a41] text-[#58d6f1]"
          >
            <span className="material-symbols-outlined text-[26px]">account_balance_wallet</span>
          </div>
        ) : (
          <PaymentSystemLogo system={item.processingSystem} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold tabular-nums text-[#d6e3ff]">
            {isUnlocked ? (
              isForeign ? (
                <span>
                  {formatForeignAmount(item.balanceForeign)}{' '}
                  <span className="text-[0.55em] font-bold uppercase tracking-wide text-[#bcc9ce]">
                    {item.foreignCurrency}
                  </span>
                </span>
              ) : (
                <UzsAmount as="span" value={formatBalance(item.balanceUzs)} />
              )
            ) : (
              <span>•••••• {isForeign ? item.foreignCurrency : 'UZS'}</span>
            )}
          </p>
          <p className="mt-0.5 truncate text-xs text-[#8fa3ad]">{item.detailLine}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isPrimary ? (
            <span className="material-symbols-outlined text-xl text-[#4cd6fb]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          ) : null}
          <span className="material-symbols-outlined text-2xl text-[#5c6b73]">chevron_right</span>
        </div>
      </button>
    </li>
  )
}
