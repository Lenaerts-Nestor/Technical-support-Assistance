/** What the desktop app's preload script (`desktop/preload.cjs`) puts on `window`. Absent on the website. */
interface Window {
  desktop?: {
    isDesktop: true
    nvx: {
      /** Sends one request to a device, logging in first if needed. It never throws: a failure comes back in the reply. */
      request: (
        request: import('../features/nvx/types').DeviceRequest & {
          ip: string
          username: string
          password: string
        },
      ) => Promise<import('../features/nvx/types').DeviceReply>
      logout: (ip: string) => Promise<void>
    }
    updater: {
      getState: () => Promise<import('../features/sync/appUpdate').AppUpdateState>
      /** Ask GitHub for the latest release; the answer arrives through `onState`. */
      check: () => Promise<void>
      download: () => Promise<void>
      /** Close the app and run the downloaded installer. */
      install: () => Promise<void>
      /** Keep a GitHub token (encrypted on this computer) for reading the private releases. */
      setToken: (token: string) => Promise<{ ok: true } | { ok: false; error: string }>
      clearToken: () => Promise<{ ok: true }>
      onState: (listener: (state: import('../features/sync/appUpdate').AppUpdateState) => void) => () => void
    }
    terminal: {
      /** Opens an SSH console on a unit. It never throws: a failure comes back as `{ ok: false, error }`. */
      open: (request: {
        /** Chosen by the page, so output can be matched to its terminal from the first byte. */
        id: string
        ip: string
        username: string
        password: string
        cols: number
        rows: number
      }) => Promise<
        | { ok: true; id: string; /** The unit's key, when this is the first time it was seen. */ newHostKey?: string }
        | { ok: false; error: string; /** The unit's key is not the one seen before. */ hostKeyChanged?: true; fingerprint?: string }
      >
      write: (id: string, data: string) => void
      resize: (id: string, cols: number, rows: number) => void
      close: (id: string) => Promise<void>
      /** Forgets a unit's remembered SSH key, for a unit that was reset or replaced. */
      forgetHost: (ip: string) => Promise<void>
      /** Output, details and "closed" notices of the terminals this page opened. Returns a function that stops listening. */
      onEvent: (
        listener: (
          message:
            | { type: 'data'; id: string; data: Uint8Array }
            | { type: 'info'; id: string; hostname?: string; firmware?: string; puf?: string }
            | { type: 'commands'; id: string; commands: string[] }
            | { type: 'closed'; id: string; reason: string },
        ) => void,
      ) => () => void
    }
  }
}
