const {app, BrowserWindow} = require("electron");
const url = require("url");
const path = require("path");

console.log(process.argv);

app.on("ready", () => {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadURL(process.argv[2] || url.format({
    pathname: path.join(__dirname, "index.html"),
    protocol: "file:",
    slashes: true
  }));
  win.on("closed", () => {
    win.destroy();
    win = undefined;
  });

  win.webContents.openDevTools();
});