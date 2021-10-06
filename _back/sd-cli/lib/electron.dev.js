const {
  app,
  BrowserWindow,
  globalShortcut
} = require("electron");

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

const configJson = JSON.parse(process.argv[2]);

app.on("ready", async () => {
  let win = new BrowserWindow({
    width: configJson.width || 1280,
    height: configJson.height || 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  win.on("closed", () => {
    win.destroy();
    win = undefined;
  });

  win.webContents.openDevTools();
  win.removeMenu();

  globalShortcut.register("CommandOrControl+Shift+R", () => {
    app.relaunch();
    app.exit();
  });

  await win.loadURL(configJson.targetUrl);
});
