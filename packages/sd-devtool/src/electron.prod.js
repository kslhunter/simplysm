const { app, BrowserWindow, dialog } = require("electron");
const path = require("path");

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1800,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  await win.loadURL(path.resolve(__dirname, "index.html"));
};

app.whenReady().then(async () => {
  await createWindow();
});