import { CopyIcon, PlusIcon } from './icons'
import { UnitRow } from './UnitRow'
import { DETAIL_FIELDS } from '../rmaData'
import {
  CARD,
  CARD_HEADER,
  GHOST_BTN,
  INPUT_LG,
  SECTION_LABEL,
  TEXTAREA,
} from '../../../shared/ui/styles'
import type { RmaController } from '../useRma'

/** The fill-in form: repeatable units, then the shipping / contact fields. */
export function RmaDetailsCard({ rma }: { rma: RmaController }) {
  const copied = rma.copied === 'details'

  return (
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <h3 className={SECTION_LABEL}>RMA Details — Fill In</h3>
        <button
          type="button"
          onClick={rma.copyDetails}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
            copied ? 'text-on-brand bg-emerald-400' : 'text-on-brand bg-brand hover:bg-brand-strong'
          }`}
        >
          <CopyIcon className="h-3.5 w-3.5" />
          {copied ? 'Copied' : 'Copy filled'}
        </button>
      </div>

      <div className="space-y-5 p-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className={SECTION_LABEL}>Units</h4>
            <button type="button" onClick={rma.addUnit} className={GHOST_BTN}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add unit
            </button>
          </div>
          <div className="space-y-2">
            {rma.units.map((unit, i) => (
              <UnitRow
                key={unit.id}
                unit={unit}
                index={i}
                showLabels={i === 0}
                canRemove={rma.units.length > 1}
                onChange={(patch) => rma.updateUnit(unit.id, patch)}
                onRemove={() => rma.removeUnit(unit.id)}
              />
            ))}
          </div>
        </div>

        <div className="border-line-soft grid grid-cols-2 gap-x-3 gap-y-4 border-t pt-4">
          {DETAIL_FIELDS.map((field) => (
            <label
              key={field.id}
              className={`block ${field.multiline ? 'col-span-2' : ''}`}
            >
              <span className={`mb-1.5 block ${SECTION_LABEL}`}>{field.label}</span>
              {field.multiline ? (
                <textarea
                  value={rma.details[field.id]}
                  onChange={(e) => rma.setDetail(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className={TEXTAREA}
                />
              ) : (
                <input
                  value={rma.details[field.id]}
                  onChange={(e) => rma.setDetail(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className={INPUT_LG}
                />
              )}
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}
