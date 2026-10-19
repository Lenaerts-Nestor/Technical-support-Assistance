import { useCallback, useEffect, useRef, useState } from 'react'
import {
  changeLine,
  flatten,
  getAtPath,
  newId,
  parseChangeStatuses,
  propertyUrl,
  setAtPath,
  summarizeStatuses,
} from './nvxData'
import type { ChangeLogEntry, NvxCall, NvxUnit, RunResult, SettingValue } from './types'

/** How many of a change's properties are read back from the device to confirm them. */
const READ_BACK_LIMIT = 5

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
  /** Every change sent in this session, oldest first. Kept on screen only. */
  const [changes, setChanges] = useState<ChangeLogEntry[]>([])
  const latest = useRef(0)
  const resultsRef = useRef(results)

  useEffect(() => {
    resultsRef.current = results
  }, [results])

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

  /**
   * Send a change to one unit, read each property back to confirm it, show the value the device now
   * reports, and log it. Never throws: a failure comes back as a log entry saying so.
   */
  const apply = useCallback(
    async (unit: NvxUnit, login: { username: string; password: string }, body: Record<string, unknown>): Promise<ChangeLogEntry> => {
      const paths = flatten(body).map((f) => f.path)
      const shownBefore = (path: string) =>
        resultsRef.current
          .filter((r) => r.unit.id === unit.id)
          .map((r) => getAtPath(r.reply.data, path))
          .find((v) => v !== undefined)
      const finish = (entry: Omit<ChangeLogEntry, 'id' | 'at' | 'unit'>) => {
        const logged: ChangeLogEntry = { id: newId(), at: Date.now(), unit, ...entry }
        setChanges((prev) => [...prev, logged])
        return logged
      }
      const lineFor = (path: string, now?: unknown) => changeLine(path, getAtPath(body, path), shownBefore(path), now)
      if (!bridge) return finish({ lines: paths.map((p) => lineFor(p)), outcome: 'failed', detail: 'Changes are sent from the Support Hub desktop app.' })

      const reply = await bridge.change({ ip: unit.ip, ...login, body })
      if (!reply.ok) return finish({ lines: paths.map((p) => lineFor(p)), outcome: 'failed', detail: reply.error ?? 'The device did not accept the change.' })

      const { outcome, detail } = summarizeStatuses(parseChangeStatuses(reply.data))
      const lines: string[] = []
      for (const path of paths.slice(0, READ_BACK_LIMIT)) {
        const url = propertyUrl(path)
        const back = url ? await bridge.get({ ip: unit.ip, ...login, path: url }) : undefined
        const now = back?.ok ? getAtPath(back.data, path) : undefined
        if (typeof now === 'string' || typeof now === 'number' || typeof now === 'boolean') {
          const value: SettingValue = now
          // Show what the device reports now wherever that property is on screen.
          setResults((prev) =>
            prev.map((r) => (r.unit.id === unit.id && r.reply.data !== undefined ? { ...r, reply: { ...r.reply, data: setAtPath(r.reply.data, path, value) } } : r)),
          )
        }
        lines.push(lineFor(path, now))
      }
      lines.push(...paths.slice(READ_BACK_LIMIT).map((p) => lineFor(p)))
      return finish({ lines, outcome, detail })
    },
    [bridge],
  )

  const clearChanges = useCallback(() => setChanges([]), [])

  const clear = useCallback(() => {
    latest.current++
    setResults([])
    setUnits([])
    setRunning(false)
  }, [])

  return { available: bridge !== undefined, results, units, running, run, clear, changes, apply, clearChanges }
}
