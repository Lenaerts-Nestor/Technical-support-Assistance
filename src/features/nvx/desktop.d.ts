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
      logout: (ip: string) => Promise<void>
    }
  }
}
