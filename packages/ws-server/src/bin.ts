#!/usr/bin/env node

import {SdWebSocketServer} from "./SdWebSocketServer";
import {Logger} from "@simplysm/common";

new SdWebSocketServer().listenAsync().catch(err => {
  new Logger("@simplysm/ws-server").error(err);
});
