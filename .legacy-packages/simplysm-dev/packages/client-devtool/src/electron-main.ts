import { app, BrowserWindow, dialog, ipcMain, Menu, screen, Tray } from "electron";
import path from "path";

const isDev = process.env["NODE_ENV"] !== "production";
const loadURL = isDev
  ? "http://localhost:50580/client-devtool/electron/"
  : path.resolve(__dirname, "index.html");

const iconPath = path.resolve(__dirname, "favicon.ico");

let isQuiting = false;
let isHiding = false;

(async () => {
  if (!app.requestSingleInstanceLock()) {
    app.exit(0);
  }

  ipcMain.handle("getVersion", () => {
    return app.getVersion();
  });

  ipcMain.handle("exit", (evt, args: [number]) => {
    app.exit(args[0]);
  });

  await app.whenReady();

  const win = await createWindow();
  createTray(win);

  if (!isDev) {
    app.setLoginItemSettings({
      openAtLogin: true,
    });
  }
})().catch(async (err) => {
  await dialog.showMessageBox({
    type: "error",
    message: err.stack,
  });
  app.exit(1);
});

async function createWindow() {
  const display = screen.getPrimaryDisplay();
  const displayWidth = display.workArea.width;
  const displayHeight = display.workArea.height;

  const win = new BrowserWindow({
    width: isDev ? 1000 : 320,
    height: 600,
    x: displayWidth - (isDev ? 1000 : 320),
    y: displayHeight - 600,
    webPreferences: {
      devTools: isDev,
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: iconPath,
    show: false, //isDev,
    frame: false,
  });

  await win.loadURL(loadURL);

  if (isDev) {
    win.webContents.openDevTools();
  } else {
    win.removeMenu();
  }

  win.on("close", (event) => {
    if (isQuiting) return;

    event.preventDefault();
    hideWindow(win);
  });

  win.on("blur", () => {
    hideWindow(win);
  });

  return win;
}

function createTray(win: BrowserWindow) {
  const tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "열기",
      click: () => {
        win.show();
      },
    },
    {
      label: "종료",
      click: () => {
        isQuiting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (isHiding) return;
    win.show();
  });
}

function hideWindow(win: BrowserWindow) {
  win.hide();

  isHiding = true;
  setTimeout(() => {
    isHiding = false;
  }, 300);
}
