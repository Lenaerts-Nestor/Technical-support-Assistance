import { Field } from './Field'
import { TrashIcon } from './icons'
import { ICON_BTN } from '../../../shared/ui/styles'
import { PRODUCT_PLACEHOLDERS } from '../voiceCallData'
import type { ProductEntry } from '../types'

/** Shared by the column labels and every row, so the fields line up under their labels. */
export const PRODUCT_GRID = 'grid grid-cols-[1.75rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3'

type ProductRowProps = {
  /** Zero-based position, shown as "01", "02" … */
  index: number
  product: ProductEntry
  canRemove: boolean
  onChange: (patch: Partial<Omit<ProductEntry, 'id'>>) => void
  onRemove: () => void
}

/** A single product / firmware / serial line inside the Products card. */
export function ProductRow({ index, product, canRemove, onChange, onRemove }: ProductRowProps) {
  const number = String(index + 1).padStart(2, '0')
  return (
    <div className={PRODUCT_GRID}>
      <span aria-hidden="true" className="text-brand-strong font-mono text-xs font-bold">
        {number}
      </span>
      <Field
        value={product.model}
        placeholder={PRODUCT_PLACEHOLDERS.model}
        aria-label={`Model / product ${number}`}
        onChange={(e) => onChange({ model: e.target.value })}
      />
      <Field
        value={product.firmware}
        placeholder={PRODUCT_PLACEHOLDERS.firmware}
        aria-label={`Firmware ${number}`}
        onChange={(e) => onChange({ firmware: e.target.value })}
      />
      <Field
        value={product.serial}
        placeholder={PRODUCT_PLACEHOLDERS.serial}
        aria-label={`Serial number ${number}`}
        onChange={(e) => onChange({ serial: e.target.value })}
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove product ${number}`}
        title="Remove product"
        className={`${ICON_BTN} flex h-9 w-9 items-center justify-center hover:!border-rose-400/60 hover:!text-rose-300 disabled:pointer-events-none`}
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
