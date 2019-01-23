#!/usr/bin/env node

import {SdServer} from "./SdServer";
import {Logger} from "@simplysm/common";

new SdServer().listenAsync().catch(err => {
  new Logger("@simplysm/server").error(err);
});
