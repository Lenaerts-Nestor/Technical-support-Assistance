import { useCallback, useEffect, useRef, useState } from 'react'

/** How long a Copy button shows its confirmed state. */
const RESET_MS = 2000

/**
 * Writes text to the clipboard and flashes a confirmed state for a moment. With
 * `html` it writes both flavours at once, so a rich editor (Salesforce, Notes,
 * Outlook) pastes the formatted version and a plain-text field gets the text.
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
    async (text: string, key: K = 'default' as K, html?: string): Promise<boolean> => {
      let done = false
      if (html && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/plain': new Blob([text], { type: 'text/plain' }),
              'text/html': new Blob([html], { type: 'text/html' }),
            }),
          ])
          done = true
        } catch {
          // Rich copy refused: fall through to plain text below.
        }
      }
      if (!done) {
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          // Denied permission or an insecure context — leave the button alone
          // rather than claiming a copy that never happened.
          return false
        }
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
