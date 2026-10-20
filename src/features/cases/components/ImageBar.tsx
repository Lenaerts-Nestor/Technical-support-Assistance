import { useState } from 'react'
import { ICON_BTN } from '../../../shared/ui/styles'
import type { CaseImage } from '../caseImages'
import { CopyIcon, TrashIcon, WarnIcon } from './icons'

type ImageBarProps = {
  /** The pictures the draft uses, in the order they appear (null while one is still loading). */
  images: (CaseImage | null)[]
  problem: string | null
  onJump: (id: number) => void
  onRemove: (id: number) => void
  onCopyImage: (id: number) => Promise<boolean>
  onDismissProblem: () => void
}

/**
 * Pictures in the draft, as small thumbnails under the toolbar. The draft is text, so each picture is a
 * `[image N]` line in it: click a thumbnail to find that line, move the line to move the picture.
 * Copy puts the pictures into the email; Plain text leaves them out.
 */
export function ImageBar({ images, problem, onJump, onRemove, onCopyImage, onDismissProblem }: ImageBarProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const shown = images.filter((i): i is CaseImage => i !== null)
  if (shown.length === 0 && !problem) return null

  const copyOne = async (id: number) => {
    if (await onCopyImage(id)) {
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500)
    }
  }

  return (
    <div className="border-line-soft border-b px-4 py-2.5" aria-label="Pictures in the draft" role="region">
      {shown.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-ink-muted text-xs font-semibold">Pictures</span>
          {shown.map((image) => (
            <figure key={image.id} className="group border-line bg-subtle relative overflow-hidden rounded-md border">
              <button type="button" className="block" onClick={() => onJump(image.id)} title={`Go to [image ${image.id}] in the text`}>
                <img src={image.dataUrl} alt={`Image ${image.id}`} className="h-14 max-w-32 object-contain" />
              </button>
              <figcaption className="bg-canvas/80 text-ink absolute bottom-0 left-0 rounded-tr-md px-1.5 text-[10px] font-bold">{image.id}</figcaption>
              <span className="absolute top-1 right-1 hidden gap-1 group-focus-within:flex group-hover:flex">
                <button type="button" className={`${ICON_BTN} bg-canvas/90`} aria-label={`Copy image ${image.id} on its own`} title="Copy this picture on its own" onClick={() => void copyOne(image.id)}>
                  {copiedId === image.id ? <span className="px-0.5 text-[10px] font-semibold">Copied</span> : <CopyIcon className="h-3 w-3" />}
                </button>
                <button type="button" className={`${ICON_BTN} bg-canvas/90`} aria-label={`Remove image ${image.id}`} title="Remove this picture from the draft" onClick={() => onRemove(image.id)}>
                  <TrashIcon className="h-3 w-3" />
                </button>
              </span>
            </figure>
          ))}
          <span className="text-ink-faint text-xs">Each [image N] line becomes the picture when you Copy.</span>
        </div>
      )}
      {problem && (
        <p role="alert" className="mt-2 flex items-start justify-between gap-3 text-xs text-yellow-100">
          <span className="flex items-start gap-2">
            <WarnIcon className="mt-px h-3.5 w-3.5 shrink-0" />
            {problem}
          </span>
          <button type="button" className="shrink-0 underline-offset-2 hover:underline" onClick={onDismissProblem}>
            Dismiss
          </button>
        </p>
      )}
    </div>
  )
}
