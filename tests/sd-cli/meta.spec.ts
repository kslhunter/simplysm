import { NgModuleGenerator } from "@simplysm/sd-cli/src/ng-tools/NgModuleGenerator";
import path from "path";
import { SdCliIndexFileGenerator } from "@simplysm/sd-cli";

describe("meta", () => {
  it("test", async () => {
    const rootPath = path.resolve(process.cwd(), "packages", "sd-angular");
    const ngModuleGen = new NgModuleGenerator(rootPath, [
      path.resolve(rootPath, "src", "controls"),
      path.resolve(rootPath, "src", "directives"),
      path.resolve(rootPath, "src", "guards"),
      path.resolve(rootPath, "src", "modals"),
      path.resolve(rootPath, "src", "providers")
    ]);
    await ngModuleGen.runAsync();

    const indexGen = new SdCliIndexFileGenerator(rootPath, { polyfills: ["@simplysm/sd-core-browser"] });
    await indexGen.runAsync();
  });
});
