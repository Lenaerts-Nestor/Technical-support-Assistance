import { createContext, useContext } from 'react'
import type { ShiftNo } from '../lunch/types'
import type { PublishInput } from './shiftLogic'

export type SharedShiftController = {
  /** False until the project key is filled in (config.ts): then nothing below does anything. */
  enabled: boolean
  /** Who this computer's user said they are, or `null`. Optional and kept in this browser only. */
  me: string | null
  setMe: (name: string | null) => void
  /** The names to pick from. */
  choices: string[]
  /** The shift `me` has today, from what was published. */
  myShift: ShiftNo | null
  /** `me` is on the publisher list (and the service is on). */
  canPublish: boolean
  /** Shares today's shifts; resolves to whether it worked. Does nothing unless `canPublish`. */
  publish: (input: PublishInput) => Promise<boolean>
}

/** Inert by default, so a page or test without the provider keeps working. */
export const SharedShiftContext = createContext<SharedShiftController>({
  enabled: false,
  me: null,
  setMe: () => {},
  choices: [],
  myShift: null,
  canPublish: false,
  publish: () => Promise.resolve(false),
})

export const useSharedShift = () => useContext(SharedShiftContext)
