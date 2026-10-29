/** Snake rules. Pure functions only: the page owns the timer, the keys and the drawing. */

export type Point = { x: number; y: number }
export type Direction = 'up' | 'down' | 'left' | 'right'

export type SnakeState = {
  /** Head first. */
  snake: Point[]
  /** The way the snake last moved. */
  dir: Direction
  /** `null` only once the snake fills the whole board. */
  food: Point | null
  score: number
  over: boolean
  /** The board is full: the best possible ending. */
  won: boolean
}

export const GRID = 20

const DELTAS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y

/** Turning straight back would run the head into its own neck. */
export const isReverse = (a: Direction, b: Direction) => OPPOSITE[a] === b

/** A random free cell, or `null` when there is none. `rng` returns a number in [0, 1). */
export function placeFood(snake: Point[], rng: () => number): Point | null {
  const taken = new Set(snake.map((p) => p.y * GRID + p.x))
  const free: Point[] = []
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) if (!taken.has(y * GRID + x)) free.push({ x, y })
  }
  return free.length === 0 ? null : free[Math.floor(rng() * free.length)]
}

/** A fresh game: three segments in the middle, heading right. */
export function newGame(rng: () => number): SnakeState {
  const mid = Math.floor(GRID / 2)
  const snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ]
  return { snake, dir: 'right', food: placeFood(snake, rng), score: 0, over: false, won: false }
}

/** Advance one tick, moving towards `dir` (ignored when it would reverse the snake). */
export function step(state: SnakeState, dir: Direction, rng: () => number): SnakeState {
  if (state.over) return state
  const heading = isReverse(state.dir, dir) ? state.dir : dir
  const delta = DELTAS[heading]
  const head = state.snake[0]
  const next = { x: head.x + delta.x, y: head.y + delta.y }

  if (next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID) return { ...state, dir: heading, over: true }

  const eats = state.food !== null && same(next, state.food)
  // The tail moves out of the way on a normal step, but stays when the snake grows.
  const body = eats ? state.snake : state.snake.slice(0, -1)
  if (body.some((p) => same(p, next))) return { ...state, dir: heading, over: true }

  const snake = [next, ...body]
  if (!eats) return { ...state, snake, dir: heading }

  const food = placeFood(snake, rng)
  return { snake, dir: heading, food, score: state.score + 1, over: food === null, won: food === null }
}

const START_DELAY_MS = 140
const FASTEST_DELAY_MS = 65

/** Milliseconds between ticks: quicker with every apple, down to a floor. */
export const tickDelay = (score: number) => Math.max(FASTEST_DELAY_MS, START_DELAY_MS - score * 3)
