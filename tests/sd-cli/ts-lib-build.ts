import { ISdCliLibPackageConfig, SdCliTsLibBuilder } from "@simplysm/sd-cli";
import path from "path";
import { Logger, LoggerSeverity } from "@simplysm/sd-core-node";

Logger.setConfig({
  console: {
    level: LoggerSeverity.debug
  }
});

describe("ts-lib-build", () => {
  it("test", async () => {
    const rootPath = path.resolve(process.cwd(), "packages/sd-angular");
    const config: ISdCliLibPackageConfig = {
      type: "library",
      autoIndex: {
        polyfills: [
          "@simplysm/sd-core-browser"
        ]
      }
    };
    const builder = new SdCliTsLibBuilder(rootPath, config, process.cwd());
    const results = await builder.buildAsync();
    console.log(results);
  });
});
