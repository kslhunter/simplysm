import { NgModuleGenerator } from "@simplysm/sd-cli";
import path from "path";

describe("meta", () => {
  it("test", async () => {
    const rootPath = path.resolve(process.cwd(), "../simplysm-ts/packages/client-common");
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

    // const indexGen = new SdCliIndexFileGenerator(rootPath, { polyfills: ["@simplysm/sd-core-browser"] });
    // await indexGen.runAsync();
  });
});
