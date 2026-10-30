import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, FocusEvent } from 'react'
import { BreakScreen } from './BreakScreen'
import { ARENA } from './config'
import { GameEngine } from './engine'
import { isGameKey } from './input'
import { loadSprites } from './draw/sprites'
import type { Sprites } from './draw/sprites'
import { DEFAULT_HERO, HEROES, HERO_LIST, isHeroId } from './heroes'
import type { HeroId } from './heroes'
import { HeroPicker } from './HeroPicker'
import type { UpgradeId } from './upgrades'
import { storageKey, usePersistentState } from '../../shared/storage/usePersistentState'
import { CARD, GHOST_BTN_MD, PAGE_SUBTITLE, PAGE_TITLE, PRIMARY_BTN, SECTION_LABEL } from '../../shared/ui/styles'

type Phase = 'idle' | 'playing' | 'paused' | 'break' | 'over'

type Run = { score: number; kills: number; round: number }

/** How long the fallen hero stays on screen before the results appear. */
const DEATH_LINGER = 1.1

/** What the keys do; the attack buttons and the shield depend on the hero, so they are added to this. */
const CONTROLS: [string, string][] = [
  ['A / D', 'run'],
  ['W / Space', 'jump (hold for height) — climb the ledges'],
  ['S (on a ledge)', 'drop through it'],
  ['Shift', 'dash — you cannot be hit for a moment (uses stamina)'],
  ['Esc', 'pause'],
]

const controlsFor = (hero: HeroId): [string, string][] => {
  const def = HEROES[hero]
  const extra: [string, string][] = []
  if (def.airJumps > 0) extra.push(['W in the air', 'jump again'])
  if (def.moves.air) extra.push(['J in the air', def.moves.air])
  if (def.moves.dash) extra.push(['J while dashing', def.moves.dash])
  if (def.canBlock) extra.push(['L (hold)', 'guard — curl up just before a hit to parry'])
  return [
    ...CONTROLS.slice(0, 4),
    ['J', `attack — ${def.moves.light}. Tap again to chain`],
    ['K', `heavy attack — ${def.moves.heavy}. Costs stamina, breaks poise`],
    ...extra,
    CONTROLS[4],
  ]
}

/**
 * Last Stand: a side-view fight against demons and shades coming through the gates on both
 * sides, over a level of ledges three tiers high. The rules
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
  /** Who is played. Remembered in this browser, since it is a choice and not a score. */
  const [hero, setHero] = usePersistentState<HeroId>(storageKey('game', 'hero'), () => DEFAULT_HERO, (raw) => (isHeroId(raw) ? raw : null))
  useEffect(() => engine.setHero(hero), [engine, hero])
  /** The pictures; the game is not drawn (or started) before they have loaded. */
  const [sprites, setSprites] = useState<Sprites | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  useEffect(() => {
    let live = true
    loadSprites().then(
      (loaded) => live && setSprites(loaded),
      () => live && setLoadFailed(true),
    )
    return () => {
      live = false
    }
  }, [])
  /** Finished runs of this visit. Kept in memory only: a reload starts the list again. */
  const [runs, setRuns] = useState<Run[]>([])
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) engine.draw(ctx, canvas.width)
  }, [engine])
  // The first picture of the arena as soon as the pictures are there.
  useEffect(() => {
    if (sprites) draw()
  }, [sprites, draw])

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

  const running = phase === 'playing' && onScreen && sprites !== null
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
    if (!sprites) return
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

  const choose = (id: HeroId, fromMouse: boolean) => {
    setHero(id)
    engine.setHero(id)
    // After a click the keyboard goes back to the game, so Enter then starts it.
    if (fromMouse) frameRef.current?.focus()
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
    if ((phase === 'idle' || phase === 'over') && /^Digit[1-9]$/.test(event.code)) {
      const chosen = HERO_LIST[Number(event.code.slice(5)) - 1]
      if (chosen) choose(chosen.id, false)
      return
    }
    if (isGameKey(event.code)) {
      event.preventDefault()
      if (phase === 'playing') engine.input.keyDown(event.code, event.repeat)
    } else if (event.code === 'Enter') {
      // On a focused button Enter already clicks it; acting here as well would do both.
      if (event.target instanceof HTMLButtonElement) return
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
            Pick a shadow and hold the ledges against demons, lancers, archers and brutes coming through the gates.
            <span className="text-ink-faint"> · scores last until you reload the page</span>
          </p>
        </div>
        <div className="flex gap-2">
          {phase === 'playing' && (
            <button type="button" onClick={pause} className={GHOST_BTN_MD}>
              Pause
            </button>
          )}
          <button type="button" onClick={begin} disabled={!sprites} className={PRIMARY_BTN}>
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
          aria-label="Game screen. Press Enter to start, then A and D to run, W to jump, S to drop off a ledge, Shift to dash and J and K to attack. The Warden holds L to guard."
          style={{ aspectRatio: `${ARENA.width} / ${ARENA.height}` }}
          className="border-line-strong focus-visible:outline-brand relative mx-auto w-full overflow-hidden rounded-lg border bg-black focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
          {phase === 'break' && <BreakScreen world={engine.world} picked={picked} onPick={pick} onContinue={begin} />}
          {phase !== 'playing' && phase !== 'break' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-black/50 px-6 py-3 text-center backdrop-blur-[2px]">
              {phase === 'idle' && (
                <div className="w-full max-w-4xl space-y-2">
                  <div>
                    <p className="text-3xl font-extrabold tracking-tight text-white">Last Stand</p>
                    <p className="mx-auto max-w-lg text-xs text-white/75">
                      Enemies come through the gates on both sides, on the ground and on the ledges. Some rounds you put them all down; in others you gather soul shards or light shrines up on the ledges while they keep coming. A boss every fifth round, and then a new place.
                    </p>
                  </div>
                  <HeroPicker hero={hero} sprites={sprites} onChange={choose} />
                  <p className="text-sm font-bold text-[#ffd27a]">
                    {loadFailed ? 'The pictures could not be loaded. Reload the page.' : sprites ? 'Press Enter to start' : 'Loading…'}
                  </p>
                </div>
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
                  <div className="w-full max-w-4xl">
                    <HeroPicker hero={hero} sprites={sprites} onChange={choose} />
                  </div>
                  <p className="text-sm font-bold text-[#ffd27a]">Press Enter to try again</p>
                  <button type="button" onClick={() => setPhase('idle')} className="text-xs font-semibold text-white/70 underline underline-offset-2 hover:text-white">
                    Back to the title
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 px-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {controlsFor(hero).map(([keys, what]) => (
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
