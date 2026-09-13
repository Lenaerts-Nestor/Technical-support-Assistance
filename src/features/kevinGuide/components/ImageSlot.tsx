import { ImageIcon } from './icons'

/**
 * Drop-in spot for a step screenshot. Pass `src` (an imported image URL, see
 * `guideImages.ts`) once the file exists under `images/`. Until then it
 * renders a labelled placeholder so the step still reads fine with no image.
 */
export function ImageSlot({ src, alt, name }: { src?: string; alt: string; name: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className="border-line max-h-80 w-full rounded-lg border object-contain"
      />
    )
  }

  return (
    <div className="border-line-strong text-ink-faint flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-8 text-center">
      <ImageIcon className="h-5 w-5" />
      <span className="text-xs">
        Screenshot coming, drop it at{' '}
        <code className="text-ink-muted">src/features/kevinGuide/images/{name}</code>
      </span>
    </div>
  )
}
