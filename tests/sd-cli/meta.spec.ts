import { SdCliNgModuleGenerator } from "@simplysm/sd-cli";
import path from "path";

describe("meta", () => {
  it("test", async () => {
    const rootPath = path.resolve(process.cwd(), "../simplysm-ts/packages/client-admin");
    // const rootPath = path.resolve(process.cwd(), "./packages/sd-angular");
    const ngModuleGen = new SdCliNgModuleGenerator(rootPath, [
      "controls",
      "directives",
      "guards",
      "modals",
      "providers",
      "app",
      "pages",
      "print-templates",
      "toasts",
      "AppPage"
    ], {
      glob: "**/*Page.ts",
      fileEndsWith: "Page",
      rootClassName: "AppPage"
    });
    await ngModuleGen.runAsync();

    // const indexGen = new SdCliIndexFileGenerator(rootPath, { polyfills: ["@simplysm/sd-core-browser"] });
    // await indexGen.runAsync();
  });
});
