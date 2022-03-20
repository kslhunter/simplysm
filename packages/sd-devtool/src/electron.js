const { app, BrowserWindow } = require("electron");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1800,
    height: 800,
    webPreferences: {
      devTools: process.env.NODE_ENV !== "production",
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  await win.loadURL(process.env.SD_ELECTRON_DEV_URL ?? path.resolve(__dirname, "index.html"));

  if (process.env.NODE_ENV !== "production") {
    await win.webContents.openDevTools();
  }
};

app.whenReady().then(async () => {
  await createWindow();
});