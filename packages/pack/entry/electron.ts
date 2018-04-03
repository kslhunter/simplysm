import {app, BrowserWindow} from "electron";
import * as url from "url";
import * as path from "path";

app.on("ready", () => {
    let win = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file:",
        slashes: true
    }));
    win.on("closed", () => {
        win = undefined;
    });
});