import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { GRID, isReverse, newGame, step, tickDelay } from './snake'
import type { Direction } from './snake'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { CARD, GHOST_BTN_MD, PAGE_SUBTITLE, PAGE_TITLE, PRIMARY_BTN, SECTION_LABEL } from '../../shared/ui/styles'

type Phase = 'idle' | 'playing' | 'paused'

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

const PAD: { dir: Direction; label: string; arrow: string; place: string }[] = [
  { dir: 'up', label: 'Up', arrow: '▲', place: 'col-start-2' },
  { dir: 'left', label: 'Left', arrow: '◀', place: 'col-start-1 row-start-2' },
  { dir: 'right', label: 'Right', arrow: '▶', place: 'col-start-3 row-start-2' },
  { dir: 'down', label: 'Down', arrow: '▼', place: 'col-start-2 row-start-2' },
]

/**
 * A small Snake game for the break between calls. The rules live in `snake.ts`; this page
 * owns the timer, the keys and the drawing. It stays mounted while another page is open,
 * so the clock only runs while the board is actually on screen.
 */
export function GamePage() {
  const [game, setGame] = useState(() => newGame(() => 0.5))
  const [phase, setPhase] = useState<Phase>('idle')
  const [onScreen, setOnScreen] = useState(true)
  const [best, setBest] = usePersistentState<number>(
    storageKey('game', 'snakeBest'),
    () => 0,
    (raw) => (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : null),
  )
  const boardRef = useRef<HTMLDivElement>(null)
  /** The latest turn asked for; applied on the next tick so two quick keys cannot fold the snake back on itself. */
  const pending = useRef<Direction>('right')

  useEffect(() => {
    const board = boardRef.current
    if (!board) return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    observer.observe(board)
    return () => observer.disconnect()
  }, [])

  const running = phase === 'playing' && !game.over && onScreen
  useEffect(() => {
    if (!running) return
    const timer = window.setTimeout(() => {
      const next = step(game, pending.current, Math.random)
      pending.current = next.dir
      setGame(next)
      if (next.over) setBest((b) => Math.max(b, next.score))
    }, tickDelay(game.score))
    return () => window.clearTimeout(timer)
  }, [running, game, setBest])

  const start = () => {
    setGame(newGame(Math.random))
    pending.current = 'right'
    setPhase('playing')
    boardRef.current?.focus()
  }

  const togglePause = () => {
    if (game.over || phase === 'idle') start()
    else setPhase((p) => (p === 'playing' ? 'paused' : 'playing'))
    boardRef.current?.focus()
  }

  const turn = (dir: Direction) => {
    if (phase !== 'playing' || isReverse(game.dir, dir)) return
    pending.current = dir
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const dir = KEY_DIRECTIONS[event.key] ?? KEY_DIRECTIONS[event.key.toLowerCase()]
    if (dir) {
      event.preventDefault()
      turn(dir)
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      togglePause()
    }
  }

  const message = game.over
    ? game.won
      ? 'You filled the board!'
      : 'Game over'
    : phase === 'paused'
      ? 'Paused'
      : phase === 'idle'
        ? 'Press Space to start'
        : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-7 sm:px-8">
      <header>
        <h2 className={PAGE_TITLE}>Game</h2>
        <p className={PAGE_SUBTITLE}>
          Snake — eat the apples, avoid the walls and your own tail.
          <span className="text-ink-faint"> · best score saved in this browser</span>
        </p>
      </header>

      <section className={`${CARD} space-y-4 p-4`} aria-label="Snake">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-6">
            <div>
              <p className={SECTION_LABEL}>Score</p>
              <p className="text-ink text-2xl font-bold tabular-nums">{game.score}</p>
            </div>
            <div>
              <p className={SECTION_LABEL}>Best</p>
              <p className="text-ink text-2xl font-bold tabular-nums">{Math.max(best, game.over ? game.score : 0)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {phase !== 'idle' && !game.over && (
              <button type="button" onClick={togglePause} className={GHOST_BTN_MD}>
                {phase === 'paused' ? 'Resume' : 'Pause'}
              </button>
            )}
            <button type="button" onClick={start} className={PRIMARY_BTN}>
              {phase === 'idle' ? 'Start' : 'New game'}
            </button>
          </div>
        </div>

        <div
          ref={boardRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label="Game board. Arrow keys or W A S D to steer, Space to pause."
          className="border-line-strong bg-field focus-visible:outline-brand relative mx-auto aspect-square w-full max-w-[min(32rem,65vh)] overflow-hidden rounded-lg border shadow-field focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <svg viewBox={`0 0 ${GRID} ${GRID}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`Snake of length ${game.snake.length}`}>
            {game.food && <circle cx={game.food.x + 0.5} cy={game.food.y + 0.5} r={0.38} className="fill-rose-400" />}
            {game.snake.map((p, i) => (
              <rect
                key={`${p.x},${p.y}`}
                x={p.x + 0.06}
                y={p.y + 0.06}
                width={0.88}
                height={0.88}
                rx={0.22}
                className={i === 0 ? 'fill-brand' : 'fill-brand opacity-70'}
              />
            ))}
          </svg>
          {message && (
            <div className="bg-canvas/70 absolute inset-0 flex flex-col items-center justify-center gap-1 text-center backdrop-blur-[1px]">
              <p className="text-ink text-xl font-bold">{message}</p>
              {game.over && <p className="text-ink-soft text-sm">Score {game.score} · press Space to play again</p>}
            </div>
          )}
        </div>

        {/* For touch screens and anyone without a keyboard handy. */}
        <div className="mx-auto grid w-40 grid-cols-3 gap-1.5 sm:hidden" aria-label="Steering buttons">
          {PAD.map(({ dir, label, arrow, place }) => (
            <button key={dir} type="button" aria-label={label} onClick={() => turn(dir)} className={`${GHOST_BTN_MD} h-12 ${place}`}>
              {arrow}
            </button>
          ))}
        </div>

        <p className="text-ink-muted text-center text-xs">Arrow keys or W A S D to steer · Space to start or pause</p>
        <p role="status" className="sr-only">
          {game.over ? `Game over. Score ${game.score}.` : ''}
        </p>
      </section>
    </div>
  )
}
