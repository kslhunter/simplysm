import * as path from "path";
import {FsUtil} from "@simplysm/sd-core-node";
import {isMetadataError, MetadataCollector} from "@angular/compiler-cli";
import * as ts from "typescript";
import {SdMetadataCollector, SdNgModuleGenerator} from "@simplysm/sd-cli";

describe("(node) cli.SdModuleMetadata", () => {
  it("1", async () => {
    /*const indexTsFilePath = path.resolve(process.cwd(), "packages", "sd-angular", "src", "index.ts");
    const tsconfigPath = path.resolve(process.cwd(), "packages", "sd-angular", "tsconfig.build.json");


    const tsconfig = await FsUtil.readJsonAsync(path.resolve(process.cwd(), "packages", "sd-angular", "tsconfig.build.json"));
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, path.dirname(tsconfigPath));
    const host = ts.createCompilerHost(parsedTsConfig.options);
    const metadataHost = new CompilerHostAdapter(host, null, parsedTsConfig.options);
    const bundler = new MetadataBundler(indexTsFilePath.replace(/\.ts$/, ""), "@simplysm/sd-angular", metadataHost);
    const bundle = bundler.getMetadataBundle();
    console.log(bundle);*/

    //----------------------------------------
    // 1. generate metadata
    //----------------------------------------

    const srcPath = path.resolve(process.cwd(), "packages", "sd-angular", "src");
    const distPath = path.resolve(process.cwd(), "packages", "sd-angular", "dist");

    const tsconfigPath = path.resolve(process.cwd(), "packages", "sd-angular", "tsconfig.build.json");
    const tsconfig = await FsUtil.readJsonAsync(tsconfigPath);
    const parsedTsConfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, path.dirname(tsconfigPath));
    const program = ts.createProgram(parsedTsConfig.fileNames, parsedTsConfig.options);

    const collector = new MetadataCollector();
    for (const sourceFile of program.getSourceFiles()) {
      const isPackageFile = !path.relative(srcPath, path.resolve(sourceFile.fileName)).includes("..");

      if (isPackageFile) {
        const metadataFilePath = path.resolve(distPath, path.relative(srcPath, path.resolve(sourceFile.fileName)))
          .replace(/\.ts$/, ".metadata.json");
        const metadata = collector.getMetadata(
          sourceFile,
          true,
          (value, tsNode) => {
            if (isMetadataError(value)) {
              console.log(value["message"]);
            }

            return value;
          }
        );

        if (metadata) {
          await FsUtil.writeFileAsync(metadataFilePath, JSON.stringify(metadata));
        }
        else {
          await FsUtil.removeAsync(metadataFilePath);
        }
      }
    }
    console.log(1);

    //----------------------------------------
    // 2. generate NgModules
    //----------------------------------------

    const metadataFilePaths = [
      path.resolve(process.cwd(), "node_modules/@angular/common/common.metadata.json"),
      path.resolve(process.cwd(), "node_modules/@angular/core/core.metadata.json"),
      path.resolve(process.cwd(), "node_modules/@angular/platform-browser/platform-browser.metadata.json"),
      path.resolve(process.cwd(), "node_modules/@angular/router/router.metadata.json"),
      ...await FsUtil.globAsync(path.resolve(process.cwd(), "packages/sd-angular/dist/**/*.metadata.json"))
    ];

    const metadataCollector = new SdMetadataCollector(distPath);
    for (const metadataFilePath of metadataFilePaths) {
      await metadataCollector.registerAsync(metadataFilePath);
    }

    const ngModuleGenerator = new SdNgModuleGenerator(
      program,
      metadataCollector,
      srcPath,
      distPath
    );
    const changed = await ngModuleGenerator.generateAsync();
    console.log(2, changed);

    //----------------------------------------
    // TODO: 3 generate NgRouteModules
    //----------------------------------------

    //----------------------------------------
    // TODO: 4 generate _routes.ts
    //----------------------------------------

    //----------------------------------------
    // 5. generate index.ts
    //----------------------------------------

    const indexTsFilePath = path.resolve(srcPath, "index.ts");
    const importTexts: string[] = [];

    const srcTsFiles = await FsUtil.globAsync(path.resolve(srcPath, "**", "*.ts"));
    for (const srcTsFile of srcTsFiles) {
      if (path.resolve(srcTsFile) === indexTsFilePath) {
        continue;
      }

      const requirePath = path.relative(path.dirname(indexTsFilePath), srcTsFile)
        .replace(/\\/g, "/")
        .replace(/\.ts$/, "");

      const contents = await FsUtil.readFileAsync(srcTsFile);
      if (contents.split("\n").some((line) => /^export /.test(line))) {
        importTexts.push(`export * from "./${requirePath}";`);
      }
      else {
        importTexts.push(`import "./${requirePath}";`);
      }
    }

    const content = importTexts.join("\n") + "\n";
    await FsUtil.writeFileAsync(indexTsFilePath, content);
    console.log(3);
  });
});
