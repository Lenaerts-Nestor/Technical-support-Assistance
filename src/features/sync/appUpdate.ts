/** Where the app update is: what the desktop app tells the Sync page (never the token). */
export type AppUpdateState = {
  /** `installed` can update itself; `portable` can only find out; `dev` is a build run from source. */
  mode: 'installed' | 'portable' | 'dev'
  /** The version of the running app. */
  version: string
  hasToken: boolean
  status: 'idle' | 'checking' | 'uptodate' | 'available' | 'downloading' | 'ready' | 'error'
  /** The newer version found, with its release notes as plain text. */
  available: { version: string; notes: string } | null
  progress: { percent: number; transferred: number; total: number; bytesPerSecond: number } | null
  error: string | null
  /** When the last check finished (milliseconds since 1970). */
  checkedAt: number | null
}

/** Whether there is something to do about an update: a newer version found, or already downloaded. */
export const hasPendingUpdate = (state: AppUpdateState | null) => state?.status === 'available' || state?.status === 'ready'

/** A size as "7.9 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
