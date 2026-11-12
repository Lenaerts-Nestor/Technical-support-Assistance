import { useCallback, useEffect, useState } from 'react'

/** Physical key (`KeyboardEvent.code`) → the character it types on this keyboard. */
type LayoutMap = ReadonlyMap<string, string>

type KeyboardWithLayout = { keyboard?: { getLayoutMap?: () => Promise<LayoutMap> } }

/** The keys the game uses, by position; the printed letter depends on the layout (QWERTY, AZERTY…). */
const LETTER_CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL', 'KeyP']

const NAMED: Record<string, string> = { Space: 'Space', Escape: 'Esc', ShiftLeft: 'Shift', ShiftRight: 'Shift' }

/** What to print on a key's cap: the layout's own letter, or the QWERTY one until it is known. */
export const keyLabel = (code: string, layout: LayoutMap | null): string => {
  const named = NAMED[code]
  if (named) return named
  const typed = layout?.get(code)
  if (typed && typed.length === 1) return typed.toUpperCase()
  return code.replace(/^Key/, '')
}

/** Replaces `{KeyW}`-style placeholders in a hint with the letters this keyboard prints on those keys. */
export const fillKeys = (text: string, layout: LayoutMap | null) =>
  text.replace(/\{(\w+)\}/g, (_, code: string) => keyLabel(code, layout))

/**
 * The current keyboard's layout. Chromium can tell us up front (`keyboard.getLayoutMap`); where it
 * cannot, the layout is learned from the keys the player actually presses (`learn`, fed by keydown).
 */
export function useKeyboardLayout() {
  const [layout, setLayout] = useState<LayoutMap | null>(null)

  useEffect(() => {
    let live = true
    const nav = navigator as Navigator & KeyboardWithLayout
    nav.keyboard?.getLayoutMap?.().then(
      (map) => live && setLayout(map),
      () => {},
    )
    return () => {
      live = false
    }
  }, [])

  const learn = useCallback((code: string, key: string) => {
    if (!LETTER_CODES.includes(code) || key.length !== 1) return
    setLayout((prev) => (prev?.get(code) === key ? prev : new Map(prev ?? []).set(code, key)))
  }, [])

  return { layout, learn }
}
