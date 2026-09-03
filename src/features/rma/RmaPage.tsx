import { useRma } from './useRma'
import { ActionDeterminator } from './components/ActionDeterminator'
import { RmaDetailsCard } from './components/RmaDetailsCard'
import { ExternalLinkIcon } from './components/icons'
import { SN_LOOKUP_URL } from './rmaData'
import { GHOST_BTN_MD, PAGE_SUBTITLE, PAGE_TITLE } from '../../shared/ui/styles'

export function RmaPage() {
  const rma = useRma()

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-8 py-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className={PAGE_TITLE}>RMA</h2>
          <p className={PAGE_SUBTITLE}>
            Return Merchandise Authorization — templates &amp; form
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={rma.clearForm}
            disabled={!rma.hasContent}
            className={GHOST_BTN_MD}
          >
            Clear form
          </button>
          <a
            href={SN_LOOKUP_URL || undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!SN_LOOKUP_URL}
            title={SN_LOOKUP_URL ? 'Open the serial lookup' : 'Set SN_LOOKUP_URL in rmaData.ts'}
            className={`${GHOST_BTN_MD} ${SN_LOOKUP_URL ? '' : 'pointer-events-none opacity-40'}`}
          >
            SN Lookup
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <div className="grid grid-cols-2 items-start gap-6">
        <RmaDetailsCard rma={rma} />
        <ActionDeterminator rma={rma} />
      </div>
    </div>
  )
}
