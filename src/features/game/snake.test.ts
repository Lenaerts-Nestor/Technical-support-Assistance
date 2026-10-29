import { describe, expect, it } from 'vitest'
import { GRID, isReverse, newGame, placeFood, step, tickDelay } from './snake'
import type { SnakeState } from './snake'

const first = () => 0

const state = (over: Partial<SnakeState>): SnakeState => ({ ...newGame(first), ...over })

describe('step', () => {
  it('moves the head one cell and drops the tail', () => {
    const start = state({ food: { x: 0, y: 0 } })
    const next = step(start, 'right', first)
    expect(next.snake).toHaveLength(3)
    expect(next.snake[0]).toEqual({ x: start.snake[0].x + 1, y: start.snake[0].y })
    expect(next.snake).not.toContainEqual(start.snake[2])
  })

  it('ignores a turn straight back', () => {
    const next = step(newGame(first), 'left', first)
    expect(next.dir).toBe('right')
    expect(next.over).toBe(false)
  })

  it('grows and scores on food, then places new food elsewhere', () => {
    const start = newGame(first)
    const head = start.snake[0]
    const next = step({ ...start, food: { x: head.x + 1, y: head.y } }, 'right', first)
    expect(next.snake).toHaveLength(4)
    expect(next.score).toBe(1)
    expect(next.food).not.toBeNull()
    expect(next.snake).not.toContainEqual(next.food)
  })

  it('ends on a wall', () => {
    const next = step(state({ snake: [{ x: GRID - 1, y: 3 }, { x: GRID - 2, y: 3 }], food: null }), 'right', first)
    expect(next.over).toBe(true)
  })

  it('ends when the head runs into the body', () => {
    const snake = [
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 6, y: 6 },
      { x: 6, y: 5 },
      { x: 6, y: 4 },
    ]
    expect(step(state({ snake, dir: 'up' }), 'right', first).over).toBe(true)
  })

  it('may follow its own tail, which moves away on the same tick', () => {
    const snake = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ]
    expect(step(state({ snake, dir: 'left', food: null }), 'down', first).over).toBe(false)
  })

  it('does nothing once the game is over', () => {
    const done = state({ over: true })
    expect(step(done, 'up', first)).toBe(done)
  })
})

describe('placeFood', () => {
  it('only picks free cells', () => {
    const snake = Array.from({ length: GRID * GRID - 1 }, (_, i) => ({ x: i % GRID, y: Math.floor(i / GRID) }))
    expect(placeFood(snake, first)).toEqual({ x: GRID - 1, y: GRID - 1 })
  })

  it('returns null on a full board', () => {
    const snake = Array.from({ length: GRID * GRID }, (_, i) => ({ x: i % GRID, y: Math.floor(i / GRID) }))
    expect(placeFood(snake, first)).toBeNull()
  })
})

describe('helpers', () => {
  it('knows opposite directions', () => {
    expect(isReverse('up', 'down')).toBe(true)
    expect(isReverse('up', 'left')).toBe(false)
  })

  it('speeds up with the score but never below the floor', () => {
    expect(tickDelay(5)).toBeLessThan(tickDelay(0))
    expect(tickDelay(1000)).toBe(tickDelay(2000))
  })
})
