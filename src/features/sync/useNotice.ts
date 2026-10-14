import { useState } from 'react'

/** A one-line result shown at the foot of a Sync card. */
export type Notice = { tone: 'ok' | 'error'; text: string }

export function useNotice() {
  return useState<Notice | null>(null)
}
