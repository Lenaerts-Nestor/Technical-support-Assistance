import { useEffect, useRef } from 'react'
import { ARMORS, COLORS, COLOR_IDS, HELMETS } from './appearance'
import type { Appearance } from './appearance'
import { drawKnightPortrait } from './draw/knight'
import type { WeaponId } from './weapons'

type PreviewProps = { look: Appearance; weapon: WeaponId }

const W = 250
const H = 250

/** The hero, standing at ease, drawn larger on the start screen so the choices can be seen. */
export function KnightPreview({ look, weapon }: PreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = W * ratio
    canvas.height = H * ratio
    let raf = 0
    let visible = true
    const start = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const glow = ctx.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, H * 0.7)
      glow.addColorStop(0, 'rgba(245,169,58,.22)')
      glow.addColorStop(1, 'rgba(245,169,58,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(0,0,0,.45)'
      ctx.beginPath()
      ctx.ellipse(W * 0.36 + 6, H - 22, 48, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.save()
      ctx.translate(W * 0.36, H - 26)
      drawKnightPortrait(ctx, look, weapon, (now - start) / 1000, 1.08)
      ctx.restore()
    }
    raf = requestAnimationFrame(frame)
    // Nothing to draw while the page is not on screen.
    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
    observer.observe(canvas)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [look, weapon])

  return <canvas ref={ref} style={{ width: W, height: H }} className="mx-auto rounded-lg border border-white/10 bg-white/5" role="img" aria-label="Preview of your hero" />
}

type LookPickerProps = {
  look: Appearance
  onChange: (look: Appearance) => void
}

const OPTION =
  'rounded-md border px-2 py-1 text-left text-[11px] font-bold leading-tight transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ffd27a]'

/** Helmet, armour and colour: three small choices, all cosmetic. */
export function LookPicker({ look, onChange }: LookPickerProps) {
  const set = <K extends keyof Appearance>(key: K, value: Appearance[K]) => onChange({ ...look, [key]: value })
  const row = (label: string) => <p className="mb-1 text-[11px] font-bold tracking-[0.12em] text-white/70 uppercase">{label}</p>

  return (
    <div className="space-y-2.5 text-left text-white">
      <div>
        {row('Helmet')}
        <div className="grid grid-cols-3 gap-1.5">
          {HELMETS.map((h) => (
            <button key={h.id} type="button" aria-pressed={look.helmet === h.id} title={h.blurb} onClick={() => set('helmet', h.id)} className={`${OPTION} ${look.helmet === h.id ? 'border-[#ffd27a] bg-[#ffd27a]/15' : 'border-white/15 bg-white/5 hover:bg-white/10'}`}>
              {h.name}
              <span className="block text-[10px] font-normal text-white/55">{h.blurb}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        {row('Armour')}
        <div className="grid grid-cols-3 gap-1.5">
          {ARMORS.map((a) => (
            <button key={a.id} type="button" aria-pressed={look.armor === a.id} title={a.blurb} onClick={() => set('armor', a.id)} className={`${OPTION} ${look.armor === a.id ? 'border-[#ffd27a] bg-[#ffd27a]/15' : 'border-white/15 bg-white/5 hover:bg-white/10'}`}>
              {a.name}
              <span className="block text-[10px] font-normal text-white/55">{a.blurb}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        {row(`Colour · ${COLORS[look.color].name}`)}
        <div className="flex gap-2">
          {COLOR_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-label={COLORS[id].name}
              aria-pressed={look.color === id}
              title={COLORS[id].name}
              onClick={() => set('color', id)}
              style={{ background: `linear-gradient(135deg, ${COLORS[id].light}, ${COLORS[id].main} 55%, ${COLORS[id].dark})` }}
              className={`h-7 w-7 rounded-full border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd27a] ${look.color === id ? 'scale-110 border-white' : 'border-white/25 hover:border-white/60'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
