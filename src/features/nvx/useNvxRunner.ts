import { useCallback, useRef, useState } from 'react'
import { newId } from './nvxData'
import type { NvxCall, NvxUnit, RunResult } from './types'

/** Failures that mean the next call would fail the same way. Retrying a wrong password could lock the account. */
const STOPS_THE_RUN = new Set(['invalid', 'auth', 'network'])

/**
 * Runs calls on one or more units through the desktop app and keeps the answers for the screen.
 * Units run side by side; each unit's own calls run one after another, and a unit that cannot be
 * logged in or reached stops there. Starting a new run discards the previous one. On the website
 * there is no bridge, so `available` is false and `run` does nothing.
 */
export function useNvxRunner() {
  const bridge = typeof window === 'undefined' ? undefined : window.desktop?.nvx
  const [results, setResults] = useState<RunResult[]>([])
  /** The units of the latest run, in the order they were asked for. */
  const [units, setUnits] = useState<NvxUnit[]>([])
  const [running, setRunning] = useState(false)
  const latest = useRef(0)

  const run = useCallback(
    async (
      targets: NvxUnit[],
      login: { username: string; password: string },
      calls: Pick<NvxCall, 'title' | 'path'>[],
    ) => {
      if (!bridge || targets.length === 0) return
      const id = ++latest.current
      setResults([])
      setUnits(targets)
      setRunning(true)
      const runOn = async (unit: NvxUnit) => {
        for (const [callIndex, call] of calls.entries()) {
          const reply = await bridge.get({ ip: unit.ip, ...login, path: call.path })
          if (id !== latest.current) return
          setResults((prev) => [...prev, { key: newId(), title: call.title, path: call.path, callIndex, unit, reply }])
          if (reply.kind && STOPS_THE_RUN.has(reply.kind)) return
        }
      }
      try {
        await Promise.all(targets.map(runOn))
      } finally {
        if (id === latest.current) setRunning(false)
      }
    },
    [bridge],
  )

  const clear = useCallback(() => {
    latest.current++
    setResults([])
    setUnits([])
    setRunning(false)
  }, [])

  return { available: bridge !== undefined, results, units, running, run, clear }
}
