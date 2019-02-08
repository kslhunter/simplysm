import {SdWebSocketServer} from "@simplysm/ws-server";
import {Logger} from "@simplysm/common";

new SdWebSocketServer()
  .listenAsync(process.cwd(), Number(process.argv[2]))
  .catch(err => {
    new Logger("@simplysm/ws-server").error(err);
    process.exit(1);
  });