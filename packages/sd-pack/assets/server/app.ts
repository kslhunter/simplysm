import * as path from "path";
import {SocketServer} from "@simplism/sd-socket";
import {JsonConvert} from "@simplism/sd-core";
import {services} from "./definitions";

(async () => {
    const appEntry = new (require("APP_ENTRY_PATH").AppEntry)();
    await appEntry.startAsync();

    const server = new SocketServer({
        services,
        clients: process.env.SD_PACK_CLIENTS.split("|");
    });
    await server.start(Number(process.env.SD_PACK_PORT), process.env.SD_PACK_HOST);
})();