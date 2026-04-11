import PaymentSystemLogo from './PaymentSystemLogo'
import UzsAmount from './UzsAmount'
import { formatForeignBalanceShort } from '../utils/balanceDisplay'

export default function PaymentCardListRow({ isUnlocked, item, onSelect, isPrimary }) {
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
                <span className="tabular-nums">
                  {formatForeignBalanceShort(item.balanceForeign, item.foreignCurrency)}
                </span>
              ) : (
                <UzsAmount
                  as="span"
                  compact
                  compactFrom={1000}
                  value={String(Math.round(item.balanceUzs ?? 0))}
                />
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
