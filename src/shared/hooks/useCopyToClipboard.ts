import { useCallback, useEffect, useRef, useState } from 'react'

/** How long a Copy button shows its confirmed state. */
const RESET_MS = 2000

/**
 * Writes text to the clipboard and flashes a confirmed state for a moment.
 *
 * The timer lives in a ref and is cleared on unmount, so copying and then
 * switching pages can't fire a state update into a gone component. `K` names
 * which button copied, for a page with more than one (RMA).
 */
export function useCopyToClipboard<K extends string = 'default'>(resetMs = RESET_MS) {
  const [copied, setCopied] = useState<K | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text: string, key: K = 'default' as K): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // Denied permission or an insecure context — leave the button alone
        // rather than claiming a copy that never happened.
        return false
      }
      setCopied(key)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(null), resetMs)
      return true
    },
    [resetMs],
  )

  return { copied, copy }
}
