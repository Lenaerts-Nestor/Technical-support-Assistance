import type { ReactNode } from 'react'
import { useMasonry } from './useMasonry'

type GuideMasonryProps = {
  items: { id: string; node: ReactNode }[]
}

/** Lays the guide's body blocks out in up to two height-balanced columns. */
export function GuideMasonry({ items }: GuideMasonryProps) {
  const { containerRef, setItemRef, columns } = useMasonry(items.length)
  const twoCol = columns[1].length > 0
  const rendered = twoCol ? columns : [columns[0]]

  return (
    <div ref={containerRef} className="flex items-start gap-4">
      {rendered.map((col, ci) => (
        <div key={ci} className={`min-w-0 space-y-4 ${twoCol ? 'flex-1' : 'w-full'}`}>
          {col.map((i) => (
            <div key={items[i].id} ref={setItemRef(i)}>
              {items[i].node}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
