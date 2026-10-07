import { useCallback, useEffect, useRef, useState } from 'react'
import { GHOST_BTN } from '../../../shared/ui/styles'
import { DevicePanel } from './DevicePanel'
import { sceneBounds } from './scene'
import type { ComponentProps } from 'react'

type PanelCanvasProps = Omit<ComponentProps<typeof DevicePanel>, 'viewBox' | 'className'> & {
  /** Fixed CSS height; omit to fill the parent. */
  height?: number | string
}

type View = { cx: number; cy: number; scale: number }

const MAX_ZOOM = 6
const MIN_ZOOM = 0.4
const DRAG_THRESHOLD = 4

/**
 * The diagram on a pannable, zoomable canvas: wheel zooms toward the pointer,
 * dragging pans, and Fit frames the whole scene. Clicks on ports still work;
 * a drag that moves past a few pixels is swallowed instead of selecting.
 */
export function PanelCanvas({ height, ...panel }: PanelCanvasProps) {
  const { device, endpoints } = panel
  const bounds = sceneBounds(device, endpoints !== undefined)
  const boxRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<View | null>(null)
  const dragged = useRef(false)
  /** Once the user has zoomed or panned, resizes stop re-framing the scene. */
  const touched = useRef(false)

  const fitScale = size.w > 0 && size.h > 0 ? Math.min(size.w / bounds.w, size.h / bounds.h) : 0

  const fit = useCallback(() => {
    if (fitScale === 0) return
    touched.current = false
    setView({ cx: bounds.x + bounds.w / 2, cy: bounds.y + bounds.h / 2, scale: fitScale })
  }, [fitScale, bounds.x, bounds.y, bounds.w, bounds.h])

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height: h } = entry.contentRect
      setSize({ w: width, h })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Re-frame when the scene itself changes shape (device swap, equipment toggled) or on first measure.
  const sceneKey = `${device.id}|${bounds.w}`
  const lastKey = useRef('')
  useEffect(() => {
    if (fitScale === 0) return
    if (lastKey.current !== sceneKey) touched.current = false
    lastKey.current = sceneKey
    // Also follows container resizes (e.g. the sidebar collapsing) until the user takes over.
    if (!touched.current) fit()
  }, [sceneKey, fitScale, fit])

  const zoomAt = useCallback(
    (factor: number, px?: number, py?: number) =>
      setView((v) => {
        if (!v || fitScale === 0) return v
        touched.current = true
        const scale = Math.min(Math.max(v.scale * factor, fitScale * MIN_ZOOM), fitScale * MAX_ZOOM)
        const mx = px ?? size.w / 2
        const my = py ?? size.h / 2
        // Keep the scene point under (mx, my) fixed while the scale changes.
        const sx = v.cx + (mx - size.w / 2) / v.scale
        const sy = v.cy + (my - size.h / 2) / v.scale
        return { scale, cx: sx - (mx - size.w / 2) / scale, cy: sy - (my - size.h / 2) / scale }
      }),
    [fitScale, size.w, size.h],
  )

  // Non-passive so the page doesn't scroll while zooming.
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !view) return
    dragged.current = false
    const start = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy }
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x
      const dy = ev.clientY - start.y
      if (!dragged.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      dragged.current = true
      touched.current = true
      setView((v) => (v ? { ...v, cx: start.cx - dx / v.scale, cy: start.cy - dy / v.scale } : v))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const viewBox =
    view && size.w > 0
      ? {
          x: view.cx - size.w / view.scale / 2,
          y: view.cy - size.h / view.scale / 2,
          w: size.w / view.scale,
          h: size.h / view.scale,
        }
      : bounds

  return (
    <div
      className="border-line bg-canvas relative overflow-hidden rounded-lg border"
      style={{ height: height ?? '100%' }}
    >
      <div
        ref={boxRef}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        // A drag that ends over a port must not also select it.
        onClickCapture={(e) => {
          if (dragged.current) {
            e.stopPropagation()
            dragged.current = false
          }
        }}
      >
        <DevicePanel {...panel} viewBox={viewBox} className="block h-full w-full select-none" />
      </div>
      <div className="absolute top-2 right-2 flex gap-1.5">
        <button type="button" onClick={() => zoomAt(1.25)} aria-label="Zoom in" className={GHOST_BTN}>
          +
        </button>
        <button type="button" onClick={() => zoomAt(0.8)} aria-label="Zoom out" className={GHOST_BTN}>
          −
        </button>
        <button type="button" onClick={fit} className={GHOST_BTN}>
          Fit
        </button>
      </div>
      <p className="text-ink-faint pointer-events-none absolute bottom-1.5 left-2.5 text-[10px]">
        Scroll to zoom · drag to move
      </p>
    </div>
  )
}
