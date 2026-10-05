const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

const store = new Store({
  defaults: {
    coins: ['BTCUSDT', 'ETHUSDT'],
    bounds: { width: 280, height: 200 },
    refreshMs: 1000,
    alwaysOnTop: false,
  },
});
const ALLOWED_KEYS = ['coins', 'refreshMs'];

let win, tray;

// one widget at a time (matters once launch-on-startup is on)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

function createWindow() {
  win = new BrowserWindow({
    ...store.get('bounds'),
    minWidth: 160, minHeight: 80,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: store.get('alwaysOnTop'),
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  const saveBounds = () => store.set('bounds', win.getBounds());
  win.on('resized', saveBounds);
  win.on('moved', saveBounds);
}

async function getTrayIcon() {
  const custom = path.join(__dirname, '..', 'assets', 'icon.png');
  return fs.existsSync(custom)
    ? nativeImage.createFromPath(custom).resize({ width: 16, height: 16 })
    : app.getFileIcon(process.execPath);
}

async function createTray() {
  tray = new Tray(await getTrayIcon());    // module-level so it isn't garbage collected
  tray.setToolTip('Crypto widget');

  const toggleVisible = () => (win.isVisible() ? win.hide() : win.show());

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show / hide', click: toggleVisible },
    {
      label: 'Always on top',
      type: 'checkbox',
      checked: store.get('alwaysOnTop'),
      click: (item) => {
        store.set('alwaysOnTop', item.checked);
        win.setAlwaysOnTop(item.checked);
      },
    },
    {
      label: 'Launch on startup',
      type: 'checkbox',
      enabled: app.isPackaged,             // see the gotcha below
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));

  tray.on('click', toggleVisible);         // left-click toggles the widget
}

ipcMain.handle('store:get', (_, key) => (ALLOWED_KEYS.includes(key) ? store.get(key) : undefined));
ipcMain.handle('store:set', (_, key, value) => { if (ALLOWED_KEYS.includes(key)) store.set(key, value); });
ipcMain.handle('app:quit', () => app.quit());

app.whenReady().then(async () => {
  if (!gotLock) return;
  createWindow();
  await createTray();
});
app.on('window-all-closed', () => app.quit());