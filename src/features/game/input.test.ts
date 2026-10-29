import { describe, expect, it } from 'vitest'
import { InputState, isGameKey } from './input'

describe('InputState', () => {
  it('reports direction from held keys and cancels opposites', () => {
    const input = new InputState()
    input.keyDown('KeyD')
    expect(input.frame().move).toBe(1)
    input.keyDown('KeyA')
    expect(input.frame().move).toBe(0)
    input.keyUp('KeyD')
    expect(input.frame().move).toBe(-1)
  })

  it('hands out a press once, even while the key stays down', () => {
    const input = new InputState()
    input.keyDown('KeyJ')
    expect(input.frame().lightPressed).toBe(true)
    expect(input.frame().lightPressed).toBe(false)
    input.keyDown('KeyJ', true)
    expect(input.frame().lightPressed).toBe(false)
  })

  it('treats WASD, arrows and space as the same actions', () => {
    const input = new InputState()
    input.keyDown('ArrowUp')
    expect(input.frame()).toMatchObject({ jumpHeld: true })
    input.clear()
    input.keyDown('Space')
    expect(input.frame().jumpPressed).toBe(true)
  })

  it('reports the drop-down key as held', () => {
    const input = new InputState()
    input.keyDown('KeyS')
    expect(input.frame()).toMatchObject({ downHeld: true })
    input.keyUp('KeyS')
    input.keyDown('ArrowDown')
    expect(input.frame().downHeld).toBe(true)
    input.keyUp('ArrowDown')
    expect(input.frame().downHeld).toBe(false)
  })

  it('hands out a heavy press once', () => {
    const input = new InputState()
    input.keyDown('KeyK')
    expect(input.frame()).toMatchObject({ heavyPressed: true })
    expect(input.frame()).toMatchObject({ heavyPressed: false })
  })

  it('forgets everything on clear and ignores unrelated keys', () => {
    const input = new InputState()
    input.keyDown('KeyD')
    input.keyDown('ShiftLeft')
    input.clear()
    expect(input.frame()).toEqual({
      move: 0,
      jumpHeld: false,
      jumpPressed: false,
      dashPressed: false,
      lightPressed: false,
      heavyPressed: false,
      blockHeld: false,
      downHeld: false,
    })
    input.keyDown('KeyZ')
    expect(isGameKey('KeyZ')).toBe(false)
    expect(isGameKey('KeyW')).toBe(true)
  })
})
