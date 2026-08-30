import type { TermPart } from '../types'

/** A definition block — usually sits at the top of a guide as framing context. */
export function TermView({ part }: { part: TermPart }) {
  const bullets = part.bullets.filter((b) => b.trim())

  return (
    <div className="rounded-xl border border-slate-200 border-l-4 border-l-indigo-300 bg-slate-50 px-4 py-3">
      {part.title && <h3 className="text-sm font-semibold text-slate-900">{part.title}</h3>}
      {part.explanation && (
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">
          {part.explanation}
        </p>
      )}
      {bullets.length > 0 && (
        <ul className="mt-2 space-y-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-600">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              <span className="whitespace-pre-line">{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
