import * as path from "path";
import {FsUtil} from "@simplysm/sd-core-node";
import * as ts from "typescript";
import {SdIndexTsFileGenerator, SdMetadataCollector, SdMetadataGenerator, SdNgModuleGenerator} from "@simplysm/sd-cli";
import {NotImplementError} from "@simplysm/sd-core-common";

describe("(node) cli.Metadata", () => {
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

    const metadataGenerator = new SdMetadataGenerator(srcPath, distPath);
    for (const sourceFile of program.getSourceFiles()) {
      const isLibraryFile = path.relative(srcPath, path.resolve(sourceFile.fileName)).includes("..");
      if (isLibraryFile) continue;
      if (sourceFile.fileName.endsWith(".d.ts")) continue;
      if (!sourceFile.fileName.endsWith(".ts")) continue;

      const diagnostics = await metadataGenerator.generateAsync(sourceFile);
      if (diagnostics.length > 0) {
        throw new NotImplementError();
      }
    }
    console.log(1);

    //----------------------------------------
    // 2. generate NgModules
    //----------------------------------------

    const metadataCollector = new SdMetadataCollector(distPath);
    for (const sourceFile of program.getSourceFiles()) {
      const isLibraryFile = path.relative(distPath, sourceFile.fileName).includes("..");
      let metadataFilePath: string;
      if (isLibraryFile && sourceFile.fileName.endsWith(".d.ts")) {
        metadataFilePath = sourceFile.fileName.replace(/\.d\.ts$/, ".metadata.json");
      }
      else if (!isLibraryFile && sourceFile.fileName.endsWith(".ts") && !sourceFile.fileName.endsWith(".d.ts")) {
        metadataFilePath = path.resolve(distPath, path.relative(srcPath, sourceFile.fileName))
          .replace(/\.ts$/, ".metadata.json");
      }
      else {
        continue;
      }

      if (FsUtil.exists(metadataFilePath)) {
        await metadataCollector.registerAsync(metadataFilePath);
      }
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

    const indexGenerator = new SdIndexTsFileGenerator(
      path.resolve(srcPath, "index.ts"),
      [],
      srcPath
    );
    const changed2 = await indexGenerator.generateAsync();
    console.log(3, changed2);
  });
});
