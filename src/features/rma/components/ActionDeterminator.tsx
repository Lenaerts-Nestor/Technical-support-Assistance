import { CopyIcon } from './icons'
import { ISSUE_CATEGORIES } from '../rmaData'
import { CARD, CARD_HEADER, GHOST_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import type { RmaController } from '../useRma'

const COLUMN_HEIGHT = 'h-[380px]'

/**
 * Two-column issue picker. Column one narrows to a category, column two to the
 * specific issue; the footer shows the pair the Copy button will emit.
 */
export function ActionDeterminator({ rma }: { rma: RmaController }) {
  const copied = rma.copied === 'determinator'
  const ready = !!rma.category && !!rma.issue

  return (
    <section className={CARD}>
      <div className={CARD_HEADER}>
        <h3 className={SECTION_LABEL}>RMA Action Determinator</h3>
        <button
          type="button"
          onClick={rma.copyDeterminator}
          disabled={!ready}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
            copied
              ? 'text-on-brand bg-emerald-400'
              : ready
                ? 'text-on-brand bg-brand hover:bg-brand-strong'
                : 'border-line bg-surface text-ink-faint pointer-events-none border'
          }`}
        >
          <CopyIcon className="h-3.5 w-3.5" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="p-4">
        <div className="border-line overflow-hidden rounded-lg border">
          <div className="border-line-soft bg-subtle grid grid-cols-[190px_1fr] border-b">
            <span className={`border-line-soft border-r px-3 py-2 ${SECTION_LABEL}`}>
              Issue 1
            </span>
            <span className={`px-3 py-2 ${SECTION_LABEL}`}>Issue 2</span>
          </div>

          <div className="grid grid-cols-[190px_1fr]">
            <div
              className={`border-line-soft ${COLUMN_HEIGHT} space-y-1 overflow-y-auto border-r p-2`}
            >
              {ISSUE_CATEGORIES.map((c) => {
                const active = rma.category?.id === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => rma.selectCategory(c.id)}
                    className={`block w-full rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                      active
                        ? 'border-brand bg-brand text-on-brand font-semibold'
                        : 'border-line bg-canvas text-ink-muted hover:border-brand-line hover:bg-brand-soft hover:text-ink'
                    }`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>

            <div className={`${COLUMN_HEIGHT} space-y-1 overflow-y-auto p-2`}>
              {!rma.category ? (
                <p className="text-ink-faint px-1 py-2 text-xs">Select a category</p>
              ) : (
                rma.category.issues.map((option) => {
                  const active = rma.issue === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => rma.selectIssue(option)}
                      className={`block w-full rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                        active
                          ? 'border-brand bg-brand text-on-brand font-semibold'
                          : 'border-line bg-canvas text-ink-muted hover:border-brand-line hover:bg-brand-soft hover:text-ink'
                      }`}
                    >
                      {option}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="border-line-soft bg-subtle text-ink-muted flex items-center gap-3 border-t px-3 py-2 text-xs">
            <span>
              Issue 1:{' '}
              <span className={rma.category ? 'text-ink font-semibold' : ''}>
                {rma.category?.label ?? '—'}
              </span>
            </span>
            <span className="bg-line h-3 w-px" aria-hidden />
            <span>
              Issue 2:{' '}
              <span className={rma.issue ? 'text-ink font-semibold' : ''}>
                {rma.issue ?? '—'}
              </span>
            </span>
          </div>
        </div>

        {!ready && (
          <p className={`mt-3 ${GHOST_BTN} pointer-events-none w-full justify-center`}>
            Pick both issues to enable Copy
          </p>
        )}
      </div>
    </section>
  )
}
