import type { BlockRef, GuideDraftController } from '../useGuideDraft'
import type { SectionBlock } from '../types'

/**
 * What every table / callout / term editor needs. `addr` says where the block
 * lives so the draft controller can find it; the frame props come from whoever
 * owns the list it sits in (the guide's top-level parts, or a section's blocks).
 */
export type BlockEditProps<T extends SectionBlock> = {
  part: T
  addr: BlockRef
  index: number
  count: number
  nested?: boolean
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  d: GuideDraftController
}
