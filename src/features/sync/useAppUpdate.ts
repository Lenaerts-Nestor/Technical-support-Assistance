import { useCallback, useEffect, useState } from 'react'
import type { AppUpdateState } from './appUpdate'

export type AppUpdateController = {
  /** `null` on the website, which has no updater, and until the desktop app has answered. */
  state: AppUpdateState | null
  check: () => void
  download: () => void
  install: () => void
  /** Resolves with an error message, or `null` when the token was saved. */
  saveToken: (token: string) => Promise<string | null>
  removeToken: () => void
}

/** The app's update state, kept up to date from the desktop app. */
export function useAppUpdate(): AppUpdateController {
  const bridge = typeof window === 'undefined' ? undefined : window.desktop?.updater
  const [state, setState] = useState<AppUpdateState | null>(null)

  useEffect(() => {
    if (!bridge) return
    let current = true
    void bridge.getState().then((initial) => current && setState((prev) => prev ?? initial))
    const stop = bridge.onState((next) => setState(next))
    return () => {
      current = false
      stop()
    }
  }, [bridge])

  const check = useCallback(() => void bridge?.check(), [bridge])
  const download = useCallback(() => void bridge?.download(), [bridge])
  const install = useCallback(() => void bridge?.install(), [bridge])
  const removeToken = useCallback(() => void bridge?.clearToken(), [bridge])
  const saveToken = useCallback(
    async (token: string) => {
      const result = await bridge?.setToken(token)
      return result && !result.ok ? result.error : result ? null : 'Updates are part of the desktop app.'
    },
    [bridge],
  )

  return { state, check, download, install, saveToken, removeToken }
}
