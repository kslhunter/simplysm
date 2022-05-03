// import sourceMapSupport from "source-map-support";
import { FsUtil, Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import path from "path";
import { SdCliTsLibBuilder } from "../builder/SdCliTsLibBuilder";
import { SdCliJsLibBuilder } from "../builder/SdCliJsLibBuilder";
import { SdCliServerBuilder } from "../builder/SdCliServerBuilder";
import { ISdCliBuildWorkerEvent, ISdCliBuildWorkerRequest, TSdCliBuildWorkerResponse } from "../commons";
import { JsonConvert } from "@simplysm/sd-core-common";
import { SdCliClientBuilder } from "../builder/SdCliClientBuilder";

// sourceMapSupport.install();

Error.stackTraceLimit = Infinity;


if (process.env["SD_CLI_LOGGER_SEVERITY"] === "DEBUG") {
  Logger.setConfig({
    console: {
      level: LoggerSeverity.debug
    }
  });
}
else {
  Logger.setConfig({
    dot: true
  });
}

const req: ISdCliBuildWorkerRequest = JsonConvert.parse(process.argv[2]);

const isTs = FsUtil.exists(path.resolve(req.rootPath, "tsconfig.json"));

const builder = req.config.type === "server" ? new SdCliServerBuilder(req.rootPath, req.config, req.workspaceRootPath)
  : req.config.type === "client" ? new SdCliClientBuilder(req.rootPath, req.config, req.workspaceRootPath)
    : isTs ? new SdCliTsLibBuilder(req.rootPath, req.config)
      : new SdCliJsLibBuilder(req.rootPath);

(async () => {
  if (req.watch) {
    await builder
      .on("change", () => {
        const evt: ISdCliBuildWorkerEvent = { type: "event", name: "change" };
        process.send!(JsonConvert.stringify(evt));
      })
      .on("complete", (results) => {
        const evt: ISdCliBuildWorkerEvent = { type: "event", name: "complete", body: results };
        process.send!(JsonConvert.stringify(evt));
      })
      .watchAsync();
    const res: TSdCliBuildWorkerResponse = { type: "response" };
    process.stdout.write(JsonConvert.stringify(res));
  }
  else {
    const results = await builder.buildAsync();
    const res: TSdCliBuildWorkerResponse = { type: "response", body: results };
    process.stdout.write(JsonConvert.stringify(res));
  }
})().catch((err) => {
  const res: TSdCliBuildWorkerResponse = { type: "error", body: err };
  process.stdout.write(JsonConvert.stringify(res));
});
