import { app, BrowserWindow, dialog, Menu, screen, Tray } from "electron";
import * as path from "path";

const isDev = process.env["NODE_ENV"] !== "production";
const iconPath = path.resolve(__dirname, process.env["SD_ELECTRON_ICON"] ?? "favicon.ico");
const loadURL = path.resolve(__dirname, process.env["SD_ELECTRON_DEV_URL"] ?? "index.html");

let isQuiting = false;
let isHiding = false;

const createWindow = async (): Promise<BrowserWindow> => {
  const display = screen.getPrimaryDisplay();
  const displayWidth = display.workArea.width;
  const displayHeight = display.workArea.height;

  dialog.showMessageBoxSync({
    message: JSON.stringify({
      __dirname: __dirname,
      cwd: process.cwd()
    }, undefined, 2),
    textWidth: 300
  });

  const win = new BrowserWindow({
    width: isDev ? 1000 : 400,
    height: 600,
    x: displayWidth - (isDev ? 1000 : 400),
    y: displayHeight - 600,
    webPreferences: {
      devTools: isDev,
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: iconPath,
    show: isDev,
    frame: false
  });

  await win.loadURL(loadURL);

  if (isDev) {
    win.webContents.openDevTools();
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
};

const createTray = (win: BrowserWindow): void => {
  const tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "열기",
      click: () => {
        win.show();
      }
    },
    {
      label: "종료",
      click: () => {
        isQuiting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (isHiding) return;
    win.show();
  });
};

const hideWindow = (win: BrowserWindow): void => {
  if (isDev) return;

  win.hide();

  isHiding = true;
  setTimeout(() => {
    isHiding = false;
  }, 300);
};


(async () => {
  await app.whenReady();

  const win = await createWindow();
  createTray(win);
})().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
});