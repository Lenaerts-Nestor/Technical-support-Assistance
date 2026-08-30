import { Field } from './Field'
import { TrashIcon } from './icons'
import { PRODUCT_PLACEHOLDERS } from '../voiceCallData'
import type { ProductEntry } from '../types'

type ProductRowProps = {
  product: ProductEntry
  canRemove: boolean
  onChange: (patch: Partial<Omit<ProductEntry, 'id'>>) => void
  onRemove: () => void
}

/** A single product / firmware / serial line inside the Products card. */
export function ProductRow({ product, canRemove, onChange, onRemove }: ProductRowProps) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-3">
      <Field
        value={product.model}
        placeholder={PRODUCT_PLACEHOLDERS.model}
        onChange={(e) => onChange({ model: e.target.value })}
      />
      <Field
        value={product.firmware}
        placeholder={PRODUCT_PLACEHOLDERS.firmware}
        onChange={(e) => onChange({ firmware: e.target.value })}
      />
      <Field
        value={product.serial}
        placeholder={PRODUCT_PLACEHOLDERS.serial}
        onChange={(e) => onChange({ serial: e.target.value })}
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove product"
        className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:pointer-events-none disabled:opacity-30"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
