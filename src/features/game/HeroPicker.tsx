import { useEffect, useRef } from 'react'
import { HERO_LIST } from './heroes'
import type { HeroId } from './heroes'
import { SPRITES } from './spriteData'
import { drawFrame } from './draw/sprites'
import type { Sprites } from './draw/sprites'

const SIZE = 128

/** One hero's idle animation, on a small canvas. */
function Portrait({ hero, sprites, active }: { hero: HeroId; sprites: Sprites; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    const sheet = sprites.characters[hero].idle
    if (!ctx || !sheet) return
    const info = SPRITES[hero]
    const frames = info.frames.idle ?? 1
    let frame = 0
    const paint = () => {
      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.imageSmoothingEnabled = false
      drawFrame(ctx, sheet, frame, SIZE / 2, SIZE - 12, 5, 1, info)
      frame = (frame + 1) % frames
    }
    paint()
    const timer = window.setInterval(paint, active ? 130 : 220)
    return () => window.clearInterval(timer)
  }, [hero, sprites, active])
  return <canvas ref={ref} width={SIZE} height={SIZE} className="mx-auto h-24 w-24 [image-rendering:pixelated]" aria-hidden="true" />
}

type HeroPickerProps = {
  hero: HeroId
  sprites: Sprites | null
  onChange: (hero: HeroId, fromMouse: boolean) => void
}

/** The four heroes side by side: who they are, what they do. */
export function HeroPicker({ hero, sprites, onChange }: HeroPickerProps) {
  return (
    <div role="radiogroup" aria-label="Choose your hero" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {HERO_LIST.map((def, index) => {
        const selected = def.id === hero
        return (
          <button
            key={def.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={(event) => onChange(def.id, event.detail > 0)}
            className={`flex flex-col gap-1 rounded-lg border p-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd27a] ${
              selected ? 'border-[#ffd27a] bg-[#ffd27a]/15 ring-2 ring-[#ffd27a]/60' : 'border-white/20 bg-white/10 hover:border-[#ffd27a]/70 hover:bg-white/15'
            }`}
          >
            {sprites ? <Portrait hero={def.id} sprites={sprites} active={selected} /> : <div className="h-24" />}
            <span className="flex items-center justify-between gap-2">
              <span className="text-base font-extrabold text-white">{def.name}</span>
              <kbd className="rounded border border-white/25 px-1.5 text-[11px] font-bold text-white/70">{index + 1}</kbd>
            </span>
            <span className="text-[11px] leading-snug text-white/75">{def.tagline}</span>
            <ul className="mt-auto space-y-0.5 text-[11px] text-white/60">
              {def.traits.map((trait) => (
                <li key={trait}>· {trait}</li>
              ))}
            </ul>
          </button>
        )
      })}
    </div>
  )
}
