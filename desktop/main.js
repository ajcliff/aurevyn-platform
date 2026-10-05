// AUREVYN desktop shell. A thin, locked-down window around the hosted AUREVYN site:
// the website is the app, so deploying the website updates every installed copy at once.
const { app, BrowserWindow, Menu, dialog, ipcMain, session, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
const APP_URL = process.env.AUREVYN_URL || config.url;
const APP_ORIGIN = new URL(APP_URL).origin;
const ICON = path.join(__dirname, "build", "icon.ico");

let mainWindow = null;
let splash = null;

// One instance only: launching again just brings the existing window forward
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

const stateFile = () => path.join(app.getPath("userData"), "window-state.json");
function loadState() {
  try { return JSON.parse(fs.readFileSync(stateFile(), "utf8")); } catch { return {}; }
}
function saveState(win) {
  try {
    const b = win.getNormalBounds();
    fs.writeFileSync(stateFile(), JSON.stringify({ ...b, maximized: win.isMaximized() }));
  } catch { /* not worth interrupting the user */ }
}

function showSplash() {
  splash = new BrowserWindow({
    width: 420, height: 320, frame: false, resizable: false, movable: true, alwaysOnTop: true,
    center: true, show: false, backgroundColor: "#1A0F14", icon: ICON, skipTaskbar: true,
  });
  splash.loadFile(path.join(__dirname, "splash.html"));
  splash.once("ready-to-show", () => splash && splash.show());
}

function closeSplash() {
  if (splash && !splash.isDestroyed()) splash.close();
  splash = null;
}

function createWindow() {
  const state = loadState();
  mainWindow = new BrowserWindow({
    width: state.width || 1366, height: state.height || 860, x: state.x, y: state.y,
    minWidth: 1024, minHeight: 640,
    show: false, title: "AUREVYN", icon: ICON, backgroundColor: "#1A0F14", autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true,
    },
  });
  if (state.maximized) mainWindow.maximize();

  // Lets the website know it's running inside the app (hides "download" and "install" prompts)
  mainWindow.webContents.setUserAgent(`${mainWindow.webContents.getUserAgent()} AurevynDesktop/${app.getVersion()}`);

  mainWindow.loadURL(APP_URL);

  let shown = false;
  const reveal = () => {
    if (shown || !mainWindow) return;
    shown = true;
    closeSplash();
    mainWindow.show();
  };
  mainWindow.webContents.once("did-finish-load", reveal);
  // If the page is slow, don't leave the splash up forever
  setTimeout(reveal, 15000);

  // Offline or unreachable: friendly screen with a Try again button
  mainWindow.webContents.on("did-fail-load", (_e, code, _desc, _url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = navigation cancelled
    mainWindow.loadFile(path.join(__dirname, "offline.html"));
    reveal();
  });

  // Keep the app on AUREVYN; anything else opens in the user's browser
  const isAppUrl = (url) => { try { return new URL(url).origin === APP_ORIGIN; } catch { return false; } };
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("file://") || isAppUrl(url)) return;
    event.preventDefault();
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) return { action: "allow" };
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", () => saveState(mainWindow));
  mainWindow.on("closed", () => { mainWindow = null; });
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "File", submenu: [
      { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => mainWindow && mainWindow.loadURL(APP_URL) },
      { type: "separator" },
      { role: "quit", label: "Exit" },
    ] },
    { label: "Edit", submenu: [
      { role: "undo" }, { role: "redo" }, { type: "separator" },
      { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
    ] },
    { label: "View", submenu: [
      { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" },
    ] },
    { label: "Help", submenu: [
      { label: "AUREVYN website", click: () => shell.openExternal(APP_URL) },
      { label: "Check for updates", click: () => checkForUpdates(true) },
      { label: `Version ${app.getVersion()}`, enabled: false },
    ] },
  ]));
}

let manualCheck = false;
function checkForUpdates(manual = false) {
  if (!app.isPackaged) {
    if (manual) dialog.showMessageBox({ message: "Updates only run in the installed app." });
    return;
  }
  manualCheck = manual;
  autoUpdater.checkForUpdates().catch((err) => console.error("Update check failed:", err));
}

function setupUpdates() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-downloaded", (info) => {
    dialog.showMessageBox(mainWindow, {
      type: "info", buttons: ["Restart now", "Later"], defaultId: 0, cancelId: 1,
      title: "Update ready", message: `AUREVYN ${info.version} is ready.`,
      detail: "Restart to finish updating. Your work on the website is saved as you go.",
    }).then(({ response }) => { if (response === 0) autoUpdater.quitAndInstall(); });
  });
  autoUpdater.on("update-not-available", () => {
    if (manualCheck) dialog.showMessageBox({ message: "You're on the latest version." });
    manualCheck = false;
  });
  autoUpdater.on("error", (err) => console.error("Updater error:", err));
  setTimeout(() => checkForUpdates(false), 10 * 1000);
  setInterval(() => checkForUpdates(false), 4 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  // Only the AUREVYN site may ask for camera (barcode scanning) and notifications
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    let origin = "";
    try { origin = new URL(details.requestingUrl).origin; } catch { /* ignore */ }
    callback(origin === APP_ORIGIN && ["media", "notifications", "clipboard-sanitized-write"].includes(permission));
  });

  buildMenu();
  showSplash();
  createWindow();
  setupUpdates();

  ipcMain.on("aurevyn:retry", () => mainWindow && mainWindow.loadURL(APP_URL));
});

app.on("window-all-closed", () => app.quit());
