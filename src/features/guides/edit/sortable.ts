import { useState } from 'react'
import type { DragEvent, HTMLAttributes, PointerEvent } from 'react'
import type { DropPos } from '../useGuideDraft'

/**
 * Drag-to-reorder for one list of editor items, on the browser's native drag
 * and drop. An item only becomes draggable while its grip is held, so text in
 * its fields can still be selected with the mouse. Lists are told apart by
 * `listId`: a step dragged over a section row is ignored, only a drop in its
 * own list counts.
 */

/** Stable key for a list that belongs to a chapter / section: `steps:<part>:<section>`. */
export const listKey = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(':')

let current: { list: string; id: string } | null = null

/** A small floating label to drag around instead of a screenshot of a whole chapter. */
function dragGhost(text: string): HTMLElement {
  const el = document.createElement('div')
  el.textContent = text.length > 48 ? `${text.slice(0, 47)}…` : text
  el.style.cssText =
    'position:fixed;top:-100px;left:-100px;padding:6px 12px;border-radius:8px;font:600 13px system-ui,sans-serif;' +
    'background:#232326;color:#f2f2f4;border:1px solid #e0952f;max-width:320px;white-space:nowrap'
  document.body.append(el)
  return el
}

export function useSortable(
  listId: string,
  id: string,
  onDrop: (fromId: string, targetId: string, pos: DropPos) => void,
  label: string,
) {
  const [armed, setArmed] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [over, setOver] = useState<DropPos | null>(null)

  const handleProps: Pick<HTMLAttributes<HTMLElement>, 'onPointerDown' | 'onPointerUp' | 'onPointerCancel'> = {
    onPointerDown: (e: PointerEvent) => {
      if (e.button === 0) setArmed(true)
    },
    onPointerUp: () => setArmed(false),
    onPointerCancel: () => setArmed(false),
  }

  const itemProps = {
    draggable: armed,
    onDragStart: (e: DragEvent) => {
      if (!armed) return
      e.stopPropagation()
      current = { list: listId, id }
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', label)
      const ghost = dragGhost(label || 'Block')
      e.dataTransfer.setDragImage(ghost, 12, 14)
      window.setTimeout(() => ghost.remove(), 0)
      setDragging(true)
    },
    onDragEnd: () => {
      current = null
      setDragging(false)
      setArmed(false)
      setOver(null)
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!current || current.list !== listId || current.id === id) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'
      const r = e.currentTarget.getBoundingClientRect()
      setOver(e.clientY < r.top + r.height / 2 ? 'before' : 'after')
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null)
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      if (!current || current.list !== listId) return
      e.preventDefault()
      e.stopPropagation()
      const from = current.id
      const pos = over ?? 'after'
      setOver(null)
      if (from !== id) onDrop(from, id, pos)
    },
  }

  return { handleProps, itemProps, dragging, over }
}

/** Class for the bar that shows where a dragged item would land. */
export const dropLineClass = (pos: DropPos) =>
  `pointer-events-none absolute inset-x-0 z-10 h-1 rounded-full bg-brand ${
    pos === 'before' ? '-top-2.5' : '-bottom-2.5'
  }`
