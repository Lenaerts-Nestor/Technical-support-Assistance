import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, FocusEvent } from 'react'
import { BreakScreen } from './BreakScreen'
import { ARENA } from './config'
import { GameEngine } from './engine'
import { isGameKey } from './input'
import type { UpgradeId } from './upgrades'
import { CARD, GHOST_BTN_MD, PAGE_SUBTITLE, PAGE_TITLE, PRIMARY_BTN, SECTION_LABEL } from '../../shared/ui/styles'

type Phase = 'idle' | 'playing' | 'paused' | 'break' | 'over'

type Run = { score: number; kills: number; round: number }

/** How long the fallen knight stays on screen before the results appear. */
const DEATH_LINGER = 1.1

const CONTROLS: [string, string][] = [
  ['A / D', 'walk'],
  ['W / Space', 'jump (hold for height)'],
  ['Shift', 'dash — you cannot be hit for a moment (uses stamina)'],
  ['J', 'attack — tap three times for the combo'],
  ['K', 'heavy attack — tap twice; costs stamina, breaks poise'],
  ['L (hold)', 'shield — only guards the way you face. Raise it just before a hit to parry'],
  ['Esc', 'pause'],
]

/**
 * Last Stand: a side-view sword fight against goblins pouring in from both sides. The rules
 * live in `sim.ts` and the drawing in `draw/`; this page owns the canvas, the keyboard focus
 * and the clock. The game only runs while the page is on screen and has the keyboard, so it
 * never keeps going behind a call.
 */
export function GamePage() {
  const [engine] = useState(() => new GameEngine())
  const [phase, setPhase] = useState<Phase>('idle')
  const [onScreen, setOnScreen] = useState(true)
  /** The upgrade taken in the current break, if any. */
  const [picked, setPicked] = useState<UpgradeId | null>(null)
  /** Finished runs of this visit. Kept in memory only: a reload starts the list again. */
  const [runs, setRuns] = useState<Run[]>([])
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) engine.draw(ctx, canvas.width)
  }, [engine])

  // Keep the canvas sharp at whatever size the page gives it, and note when it is not visible.
  useEffect(() => {
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas) return
    const fit = () => {
      const width = Math.max(1, Math.round(frame.clientWidth * (window.devicePixelRatio || 1)))
      canvas.width = width
      canvas.height = Math.round((width * ARENA.height) / ARENA.width)
      draw()
    }
    const resize = new ResizeObserver(fit)
    resize.observe(frame)
    const visibility = new IntersectionObserver(([entry]) => {
      setOnScreen(entry.isIntersecting)
      if (!entry.isIntersecting) {
        engine.input.clear()
        setPhase((p) => (p === 'playing' ? 'paused' : p))
      }
    })
    visibility.observe(frame)
    return () => {
      resize.disconnect()
      visibility.disconnect()
    }
  }, [draw, engine])

  const running = phase === 'playing' && onScreen
  useEffect(() => {
    if (!running) {
      draw()
      return
    }
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      engine.advance((now - last) / 1000)
      last = now
      draw()
      const { world } = engine
      if (world.over && world.player.stateTime > DEATH_LINGER) {
        setRuns((r) => [...r, { score: world.score, kills: world.kills, round: world.round }])
        setPhase('over')
        return
      }
      if (world.stage === 'break') {
        setPicked(null)
        setPhase('break')
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [running, engine, draw])

  const begin = () => {
    if (phase === 'break') {
      if (!picked) return
      engine.nextRound()
    } else if (phase !== 'paused') {
      engine.reset()
    }
    setPicked(null)
    setPhase('playing')
    frameRef.current?.focus()
  }

  const pick = (id: UpgradeId) => {
    if (phase === 'break' && engine.pickUpgrade(id)) setPicked(id)
  }

  const pause = () => {
    engine.input.clear()
    setPhase((p) => (p === 'playing' ? 'paused' : p))
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (phase === 'break') {
      const index = ['Digit1', 'Digit2', 'Digit3'].indexOf(event.code)
      if (index >= 0 && engine.world.offer[index]) pick(engine.world.offer[index])
      // On a focused button Enter already clicks it; handling it here as well would act twice.
      else if (event.code === 'Enter' && !(event.target instanceof HTMLButtonElement)) begin()
      return
    }
    if (isGameKey(event.code)) {
      event.preventDefault()
      if (phase === 'playing') engine.input.keyDown(event.code, event.repeat)
    } else if (event.code === 'Enter') {
      event.preventDefault()
      if (phase !== 'playing') begin()
    } else if (event.code === 'Escape' || event.code === 'KeyP') {
      event.preventDefault()
      if (phase === 'playing') pause()
      else if (phase === 'paused') begin()
    }
  }

  const onBlur = (event: FocusEvent) => {
    // Focus moving between things inside the game frame is not leaving it.
    if (event.currentTarget.contains(event.relatedTarget)) return
    pause()
  }

  const best = runs.reduce((top, run) => Math.max(top, run.score), 0)
  const last = runs[runs.length - 1]

  return (
    <div className="mx-auto max-w-[1180px] space-y-5 px-4 py-7 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={PAGE_TITLE}>Last Stand</h2>
          <p className={PAGE_SUBTITLE}>
            Hold the keep against goblins, orcs and ogres coming from both sides.
            <span className="text-ink-faint"> · scores last until you reload the page</span>
          </p>
        </div>
        <div className="flex gap-2">
          {phase === 'playing' && (
            <button type="button" onClick={pause} className={GHOST_BTN_MD}>
              Pause
            </button>
          )}
          <button type="button" onClick={begin} className={PRIMARY_BTN}>
            {phase === 'idle' ? 'Start' : phase === 'paused' ? 'Resume' : 'New game'}
          </button>
        </div>
      </header>

      <section className={`${CARD} p-3`} aria-label="Game">
        <div
          ref={frameRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onKeyUp={(event) => engine.input.keyUp(event.code)}
          onBlur={onBlur}
          onClick={() => {
            if (phase === 'paused') begin()
          }}
          aria-label="Game screen. Press Enter to start, then A and D to walk, W to jump, Shift to dash, J and K to attack and hold L for the shield."
          style={{ aspectRatio: `${ARENA.width} / ${ARENA.height}` }}
          className="border-line-strong focus-visible:outline-brand relative mx-auto w-full overflow-hidden rounded-lg border bg-black focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
          {phase === 'break' && <BreakScreen world={engine.world} picked={picked} onPick={pick} onContinue={begin} />}
          {phase !== 'playing' && phase !== 'break' && (
            <div className="bg-black/50 absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center backdrop-blur-[2px]">
              {phase === 'idle' && (
                <>
                  <p className="text-3xl font-extrabold tracking-tight text-white">Last Stand</p>
                  <p className="max-w-md text-sm text-white/75">Goblins, orcs and ogres pour in from both sides, round after round. Parry, dodge and cut them down.</p>
                  <p className="text-sm font-bold text-[#ffd27a]">Press Enter to start</p>
                </>
              )}
              {phase === 'paused' && (
                <>
                  <p className="text-3xl font-extrabold tracking-tight text-white">Paused</p>
                  <p className="text-sm font-bold text-[#ffd27a]">Press Enter or click to continue</p>
                </>
              )}
              {phase === 'over' && last && (
                <>
                  <p className="text-3xl font-extrabold tracking-tight text-white">You fell</p>
                  <p className="text-sm text-white/75">
                    Round <b className="text-white">{last.round}</b> · score <b className="text-white">{last.score}</b> · {last.kills} kill
                    {last.kills === 1 ? '' : 's'}
                  </p>
                  <ol className="w-full max-w-xs space-y-0.5 text-left text-xs text-white/75" aria-label="Runs this session">
                    {runs.slice(-5).map((run, i, shown) => {
                      const number = runs.length - shown.length + i + 1
                      return (
                        <li key={number} className={`flex justify-between rounded px-2 py-0.5 ${run === last ? 'bg-white/15 font-bold text-white' : ''}`}>
                          <span>
                            #{number} · round {run.round}
                          </span>
                          <span>
                            {run.score}
                            {run.score === best && runs.length > 1 ? ' ★' : ''}
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                  <p className="text-sm font-bold text-[#ffd27a]">Press Enter to try again</p>
                </>
              )}
            </div>
          )}
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 px-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {CONTROLS.map(([keys, what]) => (
            <div key={keys} className="flex items-baseline gap-2">
              <dt className={`${SECTION_LABEL} shrink-0`}>{keys}</dt>
              <dd className="text-ink-muted">{what}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
