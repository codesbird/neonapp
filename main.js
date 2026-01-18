const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require("electron");
const path = require("path");
const { spawn, exec } = require("child_process");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");


const isDev = false;
let backendProcess = null;

//validate only sinle instace of the app
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}



function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false
    }
  });
  // Menu.setApplicationMenu(null); // Removes the application menu

  console.log("Preload path:", path.join(__dirname, "preload.js"));

  if (isDev) {
    console.log("Development : Localhost:5173")
    win.loadURL("http://localhost:5173");
  } else {
    console.log("Production : ", path.join(__dirname, "renderer", "dist", "index.html"))
    win.loadFile(path.join(__dirname, "renderer", "dist", "index.html"));
  }
}


function startBackend() {
  if (backendProcess) return;

  const backendPath = path.join(process.resourcesPath, "backend.exe");

  backendProcess = spawn(backendPath, [], {
    windowsHide: true,
    detached: false   // IMPORTANT
  });

  backendProcess.on("exit", () => {
    backendProcess = null;
  });
}

// Kill backend.exe + all children
function killBackendTree() {
  if (!backendProcess) return;

  const pid = backendProcess.pid;
  backendProcess = null;
  // Kill backend.exe + all children
  exec(`taskkill /PID ${pid} /T /F`, () => { });
}

try {
  // 🔥 HANDLE ALL EXIT CASES
  app.on("before-quit", killBackendTree);
  app.on("will-quit", killBackendTree);
  app.on("window-all-closed", () => {
    killBackendTree();
    if (process.platform !== "darwin") app.quit();
  });
  process.on("exit", killBackendTree);
  process.on("SIGINT", killBackendTree);
  process.on("SIGTERM", killBackendTree);
}
catch (e) {
  console.log("Error in exit handlers:", e);
}

// app.whenReady().then(createWindow);
app.whenReady().then(() => {
  // killBackendTree();  // safety net
  startBackend();
  createWindow();

  const win = BrowserWindow.getAllWindows()[0];
  setupAutoUpdater(win);

  // Check for updates if enabled
  fs.readFile(settingsPath, "utf8", (err, data) => {
    if (!err) {
      const settings = JSON.parse(data);
      if (settings.autoUpdate) {
        autoUpdater.checkForUpdates();
      }
    }
  });
});


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ----------------------------------------------------------------
// const settingsPath = path.join(app.getPath("userData"), "settings.json");
// const historyPath = path.join(app.getPath("userData"), "history.json");

const baseDir =  process.cwd();
const settingsPath = path.join(baseDir, "settings.json");
const historyPath = path.join(baseDir, "history.json");
console.log("Paths : ",settingsPath,historyPath)


function ensureFile(filePath, defaultData = {}) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}


ipcMain.handle("settings:load", async () => {
  try {
    ensureFile(settingsPath, {});
    return JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch (err) {
    console.error("Settings load error:", err);
    return null;
  }
});

ipcMain.handle("settings:save", async (_, data) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("Settings save error:", err);
    return false;
  }
});


ipcMain.handle("history:load", async () => {
  try {
    ensureFile(historyPath, {"items":[]});
    return JSON.parse(fs.readFileSync(historyPath, "utf8"));
  } catch (err) {
    console.error("History load error:", err);
    return [];
  }
});

ipcMain.handle("history:set", async (_, data) => {
  try {
    fs.writeFileSync(historyPath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("History save error:", err);
    return false;
  }
});


// folder picker
ipcMain.handle("dialog:selectFolder", async () => {
  const res = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Download Folder"
  });

  if (res.canceled || res.filePaths.length === 0) {
    return null;
  }

  return res.filePaths[0];
});

// reveal folder
ipcMain.handle('revealFolder', async (_, folderPath) => {
  folderPath = path.dirname(folderPath)
  console.log("Reveal folder:", folderPath);
  await shell.showItemInFolder(folderPath);
  return true;
});

// reveal file
ipcMain.handle('revealFile', async (_, filePath) => {
  console.log("Reveal file:", filePath);
  await shell.showItemInFolder(filePath);
  return true;
});

// Delete file
ipcMain.handle('deleteFile', async (event, filePath) => {
  if (!filePath) return { success: false, error: "Thumbnail not found" };
  try {
    console.log("File path ", filePath)
    await fs.unlink(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// open file
ipcMain.handle('openFile', async (_, filePath) => {
  console.log("Open file:", filePath);
  await shell.openPath(filePath);
  return true;
});

// minimize app window
ipcMain.on("window:minimize", (event) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

// maximize app window
ipcMain.on("window:maximize", (event) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return;

  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

// close app
ipcMain.on("window:close", (event) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

// check is maximized
ipcMain.handle("window:isMaximized", () => {
  const win = BrowserWindow.getFocusedWindow();
  return win?.isMaximized();
});


// app update events
function setupAutoUpdater(win) {
  autoUpdater.autoDownload = false;

  autoUpdater.on("checking-for-update", () => {
    win.webContents.send("update:checking");
  });

  autoUpdater.on("update-available", (info) => {
    win.webContents.send("update:available", info);
  });

  autoUpdater.on("update-not-available", () => {
    win.webContents.send("update:not-available");
  });

  autoUpdater.on("download-progress", (progress) => {
    win.webContents.send("update:progress", progress);
  });

  autoUpdater.on("update-downloaded", () => {
    win.webContents.send("update:downloaded");
  });

  autoUpdater.on("error", (err) => {
    win.webContents.send("update:error", err.message);
  });
}


// user control auto or manual update
ipcMain.handle("update:check", () => {
  if (!app.isPackaged) return { skipped: true };
  return autoUpdater.checkForUpdates();
});

ipcMain.handle("update:download", () => {
  return autoUpdater.downloadUpdate();
});

ipcMain.handle("update:install", () => {
  autoUpdater.quitAndInstall();
});
