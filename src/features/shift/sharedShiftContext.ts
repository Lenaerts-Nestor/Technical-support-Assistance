import { createContext, useContext } from 'react'
import type { ShiftNo } from '../lunch/types'
import type { PublishInput, SharedDay, TeamsPost } from './shiftLogic'

export type SharedShiftController = {
  /** False until the project key is filled in (config.ts): then nothing below does anything. */
  enabled: boolean
  /** Who this computer's user said they are, or `null`. Optional and kept in this browser only. */
  me: string | null
  setMe: (name: string | null) => void
  /** The names to pick from. */
  choices: string[]
  /** The published days (newest first, up to 14 days). The Lunch Planner reads them as history. */
  days: SharedDay[]
  /** The shift `me` has today, from what was published. */
  myShift: ShiftNo | null
  /** `me` is on the publisher list (and the service is on). */
  canPublish: boolean
  /** Shares today's shifts; resolves to what happened with Teams, or `null` when it failed. Does nothing unless `canPublish`. */
  publish: (input: PublishInput) => Promise<TeamsPost | null>
}

/** Inert by default, so a page or test without the provider keeps working. */
export const SharedShiftContext = createContext<SharedShiftController>({
  enabled: false,
  me: null,
  setMe: () => {},
  choices: [],
  days: [],
  myShift: null,
  canPublish: false,
  publish: () => Promise.resolve(null),
})

export const useSharedShift = () => useContext(SharedShiftContext)
