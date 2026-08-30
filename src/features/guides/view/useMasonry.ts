import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/** Below this container width the layout drops to a single column. */
const TWO_COL_MIN_WIDTH = 720

type Columns = [number[], number[]]

const singleColumn = (count: number): Columns => [
  Array.from({ length: count }, (_, i) => i),
  [],
]

/**
 * Distribute `count` items across up to two height-balanced columns, greedily
 * placing each item in the currently-shorter column so reading order is kept.
 * Returns a ref for the container, a ref setter per item, and the assignment.
 */
export function useMasonry(count: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const [columns, setColumns] = useState<Columns>(() => singleColumn(count))

  const setItemRef = useCallback(
    (i: number) => (el: HTMLElement | null) => {
      itemRefs.current[i] = el
    },
    [],
  )

  useLayoutEffect(() => {
    itemRefs.current.length = count

    const recompute = () => {
      const width = containerRef.current?.offsetWidth ?? 0

      if (count <= 1 || width < TWO_COL_MIN_WIDTH) {
        setColumns((prev) =>
          prev[1].length === 0 && prev[0].length === count ? prev : singleColumn(count),
        )
        return
      }

      const heights = Array.from(
        { length: count },
        (_, i) => itemRefs.current[i]?.offsetHeight ?? 0,
      )
      const left: number[] = []
      const right: number[] = []
      let lh = 0
      let rh = 0
      for (let i = 0; i < count; i++) {
        if (lh <= rh) {
          left.push(i)
          lh += heights[i]
        } else {
          right.push(i)
          rh += heights[i]
        }
      }

      setColumns((prev) =>
        prev[0].join(',') === left.join(',') && prev[1].join(',') === right.join(',')
          ? prev
          : [left, right],
      )
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    if (containerRef.current) ro.observe(containerRef.current)
    itemRefs.current.forEach((el) => el && ro.observe(el))
    return () => ro.disconnect()
  }, [count])

  return { containerRef, setItemRef, columns }
}
