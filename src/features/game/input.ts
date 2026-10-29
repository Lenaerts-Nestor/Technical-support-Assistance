import type { FrameInput } from './types'

type Action = 'left' | 'right' | 'jump' | 'dash' | 'light'

/** Which keys do what. `KeyboardEvent.code` is layout-independent, so WASD stays put on AZERTY. */
const KEY_ACTIONS: Record<string, Action> = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'jump',
  ArrowUp: 'jump',
  Space: 'jump',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyJ: 'light',
}

/** Is this key one the game uses (so the page must not scroll or type with it)? */
export const isGameKey = (code: string) => code in KEY_ACTIONS

/** Remembers which game keys are down and which were pressed since the last step. */
export class InputState {
  private held = new Set<Action>()
  private pressed = new Set<Action>()

  keyDown(code: string, repeat = false) {
    const action = KEY_ACTIONS[code]
    if (!action) return
    if (!repeat && !this.held.has(action)) this.pressed.add(action)
    this.held.add(action)
  }

  keyUp(code: string) {
    const action = KEY_ACTIONS[code]
    if (action) this.held.delete(action)
  }

  /** Forget everything, e.g. when focus leaves the game and a key-up would never arrive. */
  clear() {
    this.held.clear()
    this.pressed.clear()
  }

  /** The input for the next step. Presses are handed out once. */
  frame(): FrameInput {
    const move = (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0)
    const input: FrameInput = {
      move: move as -1 | 0 | 1,
      jumpHeld: this.held.has('jump'),
      jumpPressed: this.pressed.has('jump'),
      dashPressed: this.pressed.has('dash'),
      lightPressed: this.pressed.has('light'),
    }
    this.pressed.clear()
    return input
  }
}
