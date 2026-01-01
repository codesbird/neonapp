const { contextBridge, ipcRenderer } = require("electron");

console.log("PRELOAD LOADED");


contextBridge.exposeInMainWorld("api", {
  loadSettings: () => ipcRenderer.invoke("settings:load"),
  saveSettings: (data) => ipcRenderer.invoke("settings:save", data),
  selectFolder: () => ipcRenderer.invoke("dialog:selectFolder"),
  revealFolder: (path) => ipcRenderer.invoke("revealFolder", path),
  revealFile: (path) => ipcRenderer.invoke("revealFile", path),
  deleteFile: (path) => ipcRenderer.invoke("deleteFile", path),
  openFile: (path) => ipcRenderer.invoke("openFile", path),
  readHistory: () => ipcRenderer.invoke("history:load"),
  setHistory: (data) => ipcRenderer.invoke("history:set", data),
  deleteHistory: (id) => ipcRenderer.invoke("history:delete", id)
})

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
});


contextBridge.exposeInMainWorld("updater", {
  check: () => ipcRenderer.invoke("update:check"),
  download: () => ipcRenderer.invoke("update:download"),
  install: () => ipcRenderer.invoke("update:install"),

  onChecking: (cb) => ipcRenderer.on("update:checking", cb),
  onAvailable: (cb) => ipcRenderer.on("update:available", cb),
  onNotAvailable: (cb) => ipcRenderer.on("update:not-available", cb),
  onProgress: (cb) => ipcRenderer.on("update:progress", (_, p) => cb(p)),
  onDownloaded: (cb) => ipcRenderer.on("update:downloaded", cb),
  onError: (cb) => ipcRenderer.on("update:error", (_, e) => cb(e))
});
