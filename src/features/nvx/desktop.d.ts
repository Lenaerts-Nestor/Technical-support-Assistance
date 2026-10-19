/** What the desktop app's preload script (`desktop/preload.cjs`) puts on `window`. Absent on the website. */
interface Window {
  desktop?: {
    isDesktop: true
    nvx: {
      /** Sends one request to a device, logging in first if needed. It never throws: a failure comes back in the reply. */
      request: (
        request: import('./types').DeviceRequest & {
          ip: string
          username: string
          password: string
        },
      ) => Promise<import('./types').DeviceReply>
      logout: (ip: string) => Promise<void>
    }
  }
}
