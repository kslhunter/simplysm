import { SdCliTsLibBuilder } from "../builder/SdCliTsLibBuilder";
import { SdCliJsLibBuilder } from "../builder/SdCliJsLibBuilder";
import { SdCliServerBuilder } from "../builder/SdCliServerBuilder";
import { SdCliClientBuilder } from "../builder/SdCliClientBuilder";
import { FsUtil, Logger, LoggerSeverity } from "@simplysm/sd-core-node";
import path from "path";
import { JsonConvert } from "@simplysm/sd-core-common";
import { TSdCliPackageConfig } from "../commons";


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

const type = process.argv[2] as ("build" | "watch");
const rootPath = process.argv[3];
const config = JsonConvert.parse(process.argv[4]) as TSdCliPackageConfig;
const workspaceRootPath = process.argv[5];

function createBuilder(): SdCliJsLibBuilder | SdCliTsLibBuilder | SdCliServerBuilder | SdCliClientBuilder {
  const isTs = FsUtil.exists(path.resolve(rootPath, "tsconfig.json"));

  if (config.type === "library") {
    return isTs ? new SdCliTsLibBuilder(rootPath, config, workspaceRootPath) : new SdCliJsLibBuilder(rootPath);
  }
  else if (config.type === "server") {
    return new SdCliServerBuilder(rootPath, config, workspaceRootPath);
  }
  else {
    return new SdCliClientBuilder(rootPath, config, workspaceRootPath);
  }
}

const builder = createBuilder();

if (type === "build") {
  builder.buildAsync()
    .then((result) => {
      process.send!(JsonConvert.stringify(JsonConvert.stringify(result)));
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}
else {
  builder
    .on("change", () => {
      process.send!(JsonConvert.stringify({ event: "change" }));
    })
    .on("complete", (results) => {
      process.send!(JsonConvert.stringify({ event: "complete", body: results }));
    })
    .watchAsync()
    .then(() => {
      process.send!(JsonConvert.stringify({ event: "ready" }));
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}
