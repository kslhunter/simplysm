import * as path from "path";
import {SocketServer} from "@simplism/sd-socket";
import {services} from "./AppModuleDefinitions";

(async () => {
    const server = new SocketServer({
        services,
        clients: JsonConvert.parse(process.env.SD_PACK_CLIENTS)
    });
    await server.start(process.env.SD_PACK_PORT, process.env.SD_PACK_HOST);

    const appEntry = new (require("APP_ENTRY_PATH").AppEntry)();
    await appEntry.startAsync();
})();