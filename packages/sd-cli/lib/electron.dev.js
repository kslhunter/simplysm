const {
  app,
  BrowserWindow,
  globalShortcut
} = require("electron");

const targetUrl = process.argv[2];

app.on("ready", async () => {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.on("closed", () => {
    win.destroy();
    win = undefined;
  });

  win.webContents.openDevTools();
  win.removeMenu();

  globalShortcut.register("CommandOrControl+Shift+R", () => {
    win.reload();
  });

  await win.loadURL(targetUrl);
});
