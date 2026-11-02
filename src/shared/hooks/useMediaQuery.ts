import { useSyncExternalStore } from 'react'

/**
 * A phone-sized window: narrower than Tailwind's `md` breakpoint (48rem), so this and the `max-md:` /
 * `md:` classes in the markup always switch at the same width. The desktop app's window cannot be made
 * this narrow (see `minWidth` in desktop/main.cjs), so in practice this is the website on a phone.
 */
export const PHONE_QUERY = '(max-width: 47.99rem)'

const media = (query: string): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : null

/** Whether the window matches `query` right now (false where there is no window, e.g. in tests). */
export const matchesMedia = (query: string): boolean => media(query)?.matches ?? false

/** Follows a media query as the window is resized or rotated. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = media(query)
      list?.addEventListener('change', notify)
      return () => list?.removeEventListener('change', notify)
    },
    () => matchesMedia(query),
    () => false,
  )
}

/** True on a phone-sized window. */
export const useIsPhone = (): boolean => useMediaQuery(PHONE_QUERY)
