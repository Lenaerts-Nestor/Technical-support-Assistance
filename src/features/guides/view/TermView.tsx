import type { TermPart } from '../types'

/** A definition block — usually sits at the top of a guide as framing context. */
export function TermView({ part }: { part: TermPart }) {
  const bullets = part.bullets.filter((b) => b.trim())

  return (
    <div className="rounded-xl border border-indigo-400/30 border-l-[3px] border-l-indigo-400 bg-indigo-400/8 px-4 py-3.5">
      {part.title && (
        <h3 className="text-ink flex items-center gap-2 text-sm font-semibold">
          <span className="rounded-md bg-indigo-400/20 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-indigo-200 uppercase">
            Term
          </span>
          {part.title}
        </h3>
      )}
      {part.explanation && (
        <p className="text-ink-muted mt-1.5 text-sm leading-relaxed whitespace-pre-line">
          {part.explanation}
        </p>
      )}
      {bullets.length > 0 && (
        <ul className="mt-2 space-y-1">
          {bullets.map((b, i) => (
            <li key={i} className="text-ink-muted flex gap-2 text-sm">
              <span
                aria-hidden
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-400"
              />
              <span className="whitespace-pre-line">{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
