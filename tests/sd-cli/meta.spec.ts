import { NgModuleGenerator } from "@simplysm/sd-cli/src/ng-tools/NgModuleGenerator";
import path from "path";
import { SdCliIndexFileGenerator } from "@simplysm/sd-cli";

describe("meta", () => {
  it("test", async () => {
    const rootPath = path.resolve(process.cwd(), "packages", "sd-angular");
    const ngModuleGen = new NgModuleGenerator(rootPath, [
      "controls",
      "directives",
      "guards",
      "modals",
      "providers",
      "pages",
      "print-templates",
      "toasts"
    ]);
    await ngModuleGen.runAsync();

    const indexGen = new SdCliIndexFileGenerator(rootPath, { polyfills: ["@simplysm/sd-core-browser"] });
    await indexGen.runAsync();
  });
});
