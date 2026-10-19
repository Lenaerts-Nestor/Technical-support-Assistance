/** What the desktop app's preload script (`desktop/preload.cjs`) puts on `window`. Absent on the website. */
interface Window {
  desktop?: {
    isDesktop: true
    nvx: {
      get: (request: {
        ip: string
        username: string
        password: string
        path: string
      }) => Promise<import('./types').DeviceReply>
      /** POST a partial object to /Device. The app refuses anything but plain values and never sends an empty object. */
      change: (request: {
        ip: string
        username: string
        password: string
        body: Record<string, unknown>
      }) => Promise<import('./types').DeviceReply>
      logout: (ip: string) => Promise<void>
    }
    /** Opens an `rtsp://` address in VLC. */
    openStream: (url: string) => Promise<{ ok: boolean; error?: string }>
  }
}
