import { TrashIcon } from './icons'
import { UNIT_PLACEHOLDERS } from '../rmaData'
import { DELETE_BTN, INPUT_LG, SECTION_LABEL } from '../../../shared/ui/styles'
import type { RmaUnit } from '../types'

type UnitRowProps = {
  unit: RmaUnit
  index: number
  /** Labels only show on the first row; the rest align under them. */
  showLabels: boolean
  canRemove: boolean
  onChange: (patch: Partial<Omit<RmaUnit, 'id'>>) => void
  onRemove: () => void
}

/** One serial / product pair in the Units list. */
export function UnitRow({
  unit,
  index,
  showLabels,
  canRemove,
  onChange,
  onRemove,
}: UnitRowProps) {
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
      <label className="block">
        {showLabels && (
          <span className={`mb-1.5 block ${SECTION_LABEL}`}>Serial Number</span>
        )}
        <input
          value={unit.serial}
          onChange={(e) => onChange({ serial: e.target.value })}
          placeholder={UNIT_PLACEHOLDERS.serial}
          className={INPUT_LG}
        />
      </label>
      <label className="block">
        {showLabels && (
          <span className={`mb-1.5 block ${SECTION_LABEL}`}>Product Name</span>
        )}
        <input
          value={unit.productName}
          onChange={(e) => onChange({ productName: e.target.value })}
          placeholder={UNIT_PLACEHOLDERS.productName}
          className={INPUT_LG}
        />
      </label>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove unit ${index + 1}`}
        className={`${DELETE_BTN} mb-1 p-2 disabled:pointer-events-none disabled:opacity-25`}
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
