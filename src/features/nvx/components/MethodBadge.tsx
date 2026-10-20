import type { HttpMethod } from '../types'

/** Colour per method, spelled out for Tailwind. */
const TONE: Record<HttpMethod, string> = {
  GET: 'text-emerald-300',
  POST: 'text-amber-300',
  PUT: 'text-sky-300',
  PATCH: 'text-violet-300',
  DELETE: 'text-rose-300',
}

/** The method of a request, in the colour Postman users expect. */
export function MethodBadge({ method }: { method: HttpMethod }) {
  return <span className={`${TONE[method]} w-11 shrink-0 font-mono text-[11px] font-bold tracking-wide`}>{method}</span>
}
