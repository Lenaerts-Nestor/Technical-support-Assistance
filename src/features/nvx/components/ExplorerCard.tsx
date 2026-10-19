import { CARD, CARD_HEADER, GHOST_BTN, INPUT, PRIMARY_BTN, SECTION_LABEL } from '../../../shared/ui/styles'
import { normalizePath } from '../nvxData'

type ExplorerCardProps = {
  path: string
  onPath: (path: string) => void
  blockedReason: string | null
  running: boolean
  onSend: (path: string) => void
  onSave: (path: string) => void
}

/** Try any path on the selected unit and see the answer; save the ones worth keeping. */
export function ExplorerCard({ path, onPath, blockedReason, running, onSend, onSave }: ExplorerCardProps) {
  const clean = normalizePath(path)
  return (
    <section className={CARD} aria-label="Explorer">
      <header className={CARD_HEADER}>
        <h3 className={SECTION_LABEL}>Explorer</h3>
      </header>
      <form
        className="space-y-2 p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (clean && !blockedReason && !running) onSend(clean)
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink-muted font-mono text-sm font-semibold">GET</span>
          <input
            className={`${INPUT} min-w-[16rem] flex-1 py-2 font-mono text-[15px]`}
            value={path}
            placeholder="/Device/DeviceInfo"
            aria-label="Path on the device"
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => onPath(e.target.value)}
          />
          <button type="submit" className={PRIMARY_BTN} disabled={!clean || blockedReason !== null || running}>
            Send
          </button>
          <button type="button" className={GHOST_BTN} disabled={!clean} onClick={() => clean && onSave(clean)}>
            Save as call
          </button>
        </div>
        {path.trim() && !clean && <p className="text-sm text-rose-300">That is not a path the app can send. It must start with / and have no spaces.</p>}
        {blockedReason && <p className="text-ink-muted text-sm">{blockedReason}</p>}
      </form>
    </section>
  )
}
