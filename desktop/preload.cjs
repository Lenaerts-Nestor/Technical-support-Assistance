// Runs before the page. The only thing it exposes is a flag, so later features can
// tell the desktop app from the website.
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('desktop', { isDesktop: true })
