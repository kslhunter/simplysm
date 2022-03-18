const { app, BrowserWindow, dialog } = require("electron");

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1800,
    height: 800,
    webPreferences: {
      devTools: true,
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  await win.loadURL("http://localhost:60280/sd-devtool/electron/");
  await win.webContents.openDevTools();
};

app.whenReady().then(async () => {
  await createWindow();
});