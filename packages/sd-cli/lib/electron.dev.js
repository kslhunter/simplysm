const {
  app,
  BrowserWindow
} = require("electron");

const targetUrl = process.argv[2];

app.on("ready", async () => {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true
    }
  });

  win.on("closed", () => {
    win.destroy();
    win = undefined;
  });

  win.webContents.openDevTools();

  await win.loadURL(targetUrl);
});
