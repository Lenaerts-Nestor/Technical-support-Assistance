import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ComponentProps, ReactNode, Ref } from 'react'
import { GHOST_BTN } from '../../../shared/ui/styles'
import type { Resolution } from './connect'
import { DevicePanel, type Pending } from './DevicePanel'
import { anchorOfPoint, deviceBounds, layoutScene, parsePoint, type Pt } from './scene'

type PanelCanvasProps = Omit<
  ComponentProps<typeof DevicePanel>,
  'viewBox' | 'className' | 'connectable' | 'pending'
> & {
  /** Fixed CSS height; omit to fill the parent. */
  height?: number | string
  /** When set, ports can be dragged onto other ports or boxes; called with both ends' ids. */
  onConnect?: (fromId: string, toId: string) => void
  /**
   * Decides what a drop would do: connect to a specific port, to the first free
   * compatible port of a box, or be refused with a reason (shown while dragging).
   */
  resolveConnection?: (fromId: string, dropId: string) => Resolution
  /** When set, unit boxes can be dragged; called continuously with the new top-left. */
  onMoveUnit?: (endpointId: string, pos: Pt) => void
  /**
   * When set, clicking a port opens this menu beside the click (and a "+" on a
   * plain box does too).
   */
  renderMenu?: (pointId: string, close: () => void) => ReactNode
  /** Extra controls pinned top-left. */
  toolbar?: ReactNode
  /** Lets the editor drive the view, e.g. from a list of units. */
  ref?: Ref<PanelCanvasHandle>
}

export type PanelCanvasHandle = {
  /** Pan to a unit's box, zooming in a little if the whole scene is showing. */
  focusUnit: (unitId: string) => void
}

type View = { cx: number; cy: number; scale: number }

const MAX_ZOOM = 6
const MIN_ZOOM = 0.4
const DRAG_THRESHOLD = 4
const GRID = 10
const MENU_W = 288

/**
 * The diagram on a pannable, zoomable canvas: wheel zooms toward the pointer,
 * dragging the background pans, and Fit frames the whole scene. In the editor
 * it also lets unit boxes be dragged around, cables be dragged out of any port
 * (with a live check of whether the drop is allowed), and opens a menu when a
 * port is clicked. Clicks still work: a drag that moves past a few pixels is
 * swallowed instead of selecting.
 */
export function PanelCanvas({
  height,
  onConnect,
  resolveConnection,
  onMoveUnit,
  renderMenu,
  toolbar,
  ref,
  ...panel
}: PanelCanvasProps) {
  const { device, endpoints, cables, onPortClick } = panel
  const scene = layoutScene(device, endpoints ?? [], cables ?? [])
  const bounds = endpoints !== undefined ? scene.bounds : deviceBounds(device)
  const boxRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<View | null>(null)
  const dragged = useRef(false)
  /** Once the user has zoomed or panned, resizes stop re-framing the scene. */
  const touched = useRef(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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

  // Re-frame when the scene itself changes shape (device swap, units added) or on first measure.
  // Keyed on what is in the scene, not where boxes are, so dragging a box doesn't re-frame the view under the pointer.
  const sceneKey = `${device.id}|${endpoints?.length ?? -1}|${(cables ?? []).length}`
  const lastKey = useRef('')
  useEffect(() => {
    if (fitScale === 0) return
    if (lastKey.current !== sceneKey) touched.current = false
    lastKey.current = sceneKey
    // Also follows container resizes (e.g. the sidebar collapsing) until the user takes over.
    if (!touched.current) fit()
  }, [sceneKey, fitScale, fit])

  useImperativeHandle(
    ref,
    () => ({
      focusUnit: (unitId) => {
        const item = scene.items.find((i) => i.endpoint.id === unitId)
        if (!item || fitScale === 0) return
        touched.current = true
        setView((v) => ({
          cx: item.x + item.w / 2,
          cy: item.y + item.h / 2,
          scale: Math.max(v?.scale ?? fitScale, fitScale * 1.15),
        }))
      },
    }),
    [scene, fitScale],
  )

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4500)
    return () => clearTimeout(t)
  }, [notice])

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

  /** Pointer position in scene units, from the current framing. */
  const toScene = (clientX: number, clientY: number): Pt | null => {
    const el = boxRef.current
    if (!el || !view) return null
    const r = el.getBoundingClientRect()
    return {
      x: view.cx + (clientX - r.left - size.w / 2) / view.scale,
      y: view.cy + (clientY - r.top - size.h / 2) / view.scale,
    }
  }

  const openMenuAt = (id: string, clientX: number, clientY: number) => {
    const r = boxRef.current?.getBoundingClientRect()
    if (!r || !renderMenu) return
    setMenu({
      id,
      x: Math.min(clientX - r.left + 8, Math.max(8, r.width - MENU_W - 8)),
      y: Math.max(8, Math.min(clientY - r.top, r.height - 120)),
    })
  }

  const pointAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest('[data-point-id]')?.getAttribute('data-point-id') ?? null

  /**
   * Drag a cable out of a port (or the "+" of a plain box). A dashed line follows
   * the pointer and says whether dropping would work; a plain click is left to
   * the normal click handling (the "+" opens its menu).
   */
  const startConnect = (fromId: string, e: React.PointerEvent, isHandle: boolean) => {
    const from = anchorOfPoint(device, scene.items, fromId)?.pt
    if (!from) return
    const startX = e.clientX
    const startY = e.clientY
    let moved = false
    const state = (ev: PointerEvent): Pending | null => {
      const to = toScene(ev.clientX, ev.clientY)
      if (!to) return null
      const drop = pointAt(ev.clientX, ev.clientY)
      if (!drop || drop === fromId) return { from, to, target: null, ok: null }
      const res = resolveConnection ? resolveConnection(fromId, drop) : ({ ok: true, to: drop } as Resolution)
      return {
        from,
        to,
        target: res.to ?? drop,
        ok: res.ok,
        reason: res.ok ? undefined : res.reason,
      }
    }
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return
      moved = true
      dragged.current = true
      setPending(state(ev))
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setPending(null)
      if (!moved) {
        if (isHandle) openMenuAt(fromId, ev.clientX, ev.clientY)
        return
      }
      const drop = pointAt(ev.clientX, ev.clientY)
      if (!drop || drop === fromId) return
      const res = resolveConnection ? resolveConnection(fromId, drop) : ({ ok: true, to: drop } as Resolution)
      if (res.ok) onConnect?.(res.from ?? fromId, res.to)
      else if (res.reason) setNotice(res.reason)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** Drag a unit box: snaps to a grid; a tiny movement stays a click. */
  const startMoveUnit = (pointId: string, e: React.PointerEvent) => {
    const item = scene.items.find((i) => `ep:${i.endpoint.id}` === pointId)
    const start = toScene(e.clientX, e.clientY)
    if (!item || !start) return false
    const sx = e.clientX
    const sy = e.clientY
    let moved = false
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_THRESHOLD) return
      moved = true
      dragged.current = true
      touched.current = true
      const cur = toScene(ev.clientX, ev.clientY)
      if (!cur) return
      onMoveUnit?.(item.endpoint.id, {
        x: Math.round((item.x + cur.x - start.x) / GRID) * GRID,
        y: Math.round((item.y + cur.y - start.y) / GRID) * GRID,
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return true
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !view) return
    setMenu(null)
    const target = e.target as Element
    const handle = target.closest('[data-handle]')
    if (handle && (onConnect || renderMenu)) {
      startConnect(handle.getAttribute('data-handle')!, e, true)
      return
    }
    const point = target.closest('[data-point-id]')?.getAttribute('data-point-id')
    dragged.current = false
    if (point) {
      const pt = parsePoint(point)
      const isBox = !!pt && !pt.portKey
      if (isBox && onMoveUnit && startMoveUnit(point, e)) return
      // Any port, chassis or unit, can start a cable.
      if (!isBox && onConnect) {
        startConnect(point, e, false)
        return
      }
    }
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
      onKeyDown={(e) => e.key === 'Escape' && setMenu(null)}
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
        <DevicePanel
          {...panel}
          onPortClick={(id, e) => {
            onPortClick?.(id, e)
            // A port opens the menu where it was clicked; a box is selected, not menu'd.
            const pt = parsePoint(id)
            if (renderMenu && !(pt && !pt.portKey)) {
              const r = (e.currentTarget as Element).getBoundingClientRect()
              openMenuAt(id, 'clientX' in e ? e.clientX : r.right, 'clientY' in e ? e.clientY : r.top)
            }
          }}
          viewBox={viewBox}
          connectable={!!onConnect || !!renderMenu}
          pending={pending}
          className="block h-full w-full select-none"
        />
      </div>

      <div className="absolute top-2 left-2 flex gap-1.5">{toolbar}</div>
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
      {menu && renderMenu && (
        <div
          className="border-line-strong bg-surface shadow-card absolute z-10 max-h-[70%] overflow-y-auto rounded-lg border p-2.5"
          style={{ left: menu.x, top: menu.y, width: MENU_W }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {renderMenu(menu.id, () => setMenu(null))}
        </div>
      )}
      {notice && (
        <div
          role="alert"
          className="absolute bottom-7 left-1/2 z-10 max-w-[80%] -translate-x-1/2 rounded-md border border-rose-400/50 bg-rose-950/90 px-3 py-1.5 text-xs font-medium text-rose-100 shadow-card"
        >
          {notice}
        </div>
      )}
      <p className="text-ink-faint pointer-events-none absolute bottom-1.5 left-2.5 text-[10px]">
        Scroll to zoom · drag to move
      </p>
    </div>
  )
}
