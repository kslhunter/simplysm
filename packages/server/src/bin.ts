#!/usr/bin/env node

import {SdSocketServer} from "./SdSocketServer";
import {Logger} from "@simplysm/common";

new SdSocketServer().startAsync().catch(err => {
  new Logger("@simplysm/server").error(err);
});
