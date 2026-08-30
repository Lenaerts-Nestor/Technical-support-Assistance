import { useEffect, useState } from 'react'

/**
 * Track which anchor (by element id) is currently near the top of the viewport.
 * `ids` should be a stable reference (memoise it in the caller).
 */
export function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null)

  useEffect(() => {
    if (ids.length === 0) return

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const next = ids.find((id) => visible.has(id))
        if (next) setActive(next)
      },
      { rootMargin: '0px 0px -65% 0px', threshold: 0 },
    )

    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    els.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [ids])

  return active
}
