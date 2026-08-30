import { CopyIcon } from './icons'

type CallHeaderProps = {
  justCopied: boolean
  onCopy: () => void
}

/** Page title plus the Copy notes action. */
export function CallHeader({ justCopied, onCopy }: CallHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Voice Call</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Fill in during the call. Tab to jump between fields.
        </p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
      >
        <CopyIcon className="h-4 w-4" />
        {justCopied ? 'Copied' : 'Copy notes'}
      </button>
    </header>
  )
}
