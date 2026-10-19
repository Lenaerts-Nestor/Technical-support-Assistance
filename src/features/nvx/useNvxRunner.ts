import { useCallback, useRef, useState } from 'react'
import { newId } from './nvxData'
import type { NvxCall, NvxUnit, RunResult } from './types'

/** Failures that mean the next call would fail the same way. Retrying a wrong password could lock the account. */
const STOPS_THE_RUN = new Set(['invalid', 'auth', 'network'])

/**
 * Runs calls on one unit through the desktop app, one after another, and keeps the answers for
 * the screen. Starting a new run discards the previous one. On the website there is no
 * bridge, so `available` is false and `run` does nothing.
 */
export function useNvxRunner() {
  const bridge = typeof window === 'undefined' ? undefined : window.desktop?.nvx
  const [results, setResults] = useState<RunResult[]>([])
  const [running, setRunning] = useState(false)
  const latest = useRef(0)

  const run = useCallback(
    async (unit: NvxUnit, login: { username: string; password: string }, calls: Pick<NvxCall, 'title' | 'path'>[]) => {
      if (!bridge) return
      const id = ++latest.current
      setResults([])
      setRunning(true)
      try {
        for (const call of calls) {
          const reply = await bridge.get({ ip: unit.ip, ...login, path: call.path })
          if (id !== latest.current) return
          setResults((prev) => [...prev, { key: newId(), title: call.title, path: call.path, unit, reply }])
          if (reply.kind && STOPS_THE_RUN.has(reply.kind)) break
        }
      } finally {
        if (id === latest.current) setRunning(false)
      }
    },
    [bridge],
  )

  const clear = useCallback(() => {
    latest.current++
    setResults([])
    setRunning(false)
  }, [])

  return { available: bridge !== undefined, results, running, run, clear }
}
