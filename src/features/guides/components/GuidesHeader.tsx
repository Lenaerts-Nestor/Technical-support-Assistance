import { PlusIcon } from './icons'

type GuidesHeaderProps = {
  onNewGuide: () => void
}

/** Page title + the New Guide action. */
export function GuidesHeader({ onNewGuide }: GuidesHeaderProps) {
  return (
    <header className="flex items-start justify-between">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Guides</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Step-by-step reference guides
        </p>
      </div>
      <button
        type="button"
        onClick={onNewGuide}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        <PlusIcon className="h-4 w-4" />
        New Guide
      </button>
    </header>
  )
}
