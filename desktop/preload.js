const { contextBridge, ipcRenderer } = require("electron");

// The only thing the offline screen needs from the app shell
contextBridge.exposeInMainWorld("aurevyn", {
  retry: () => ipcRenderer.send("aurevyn:retry"),
});
