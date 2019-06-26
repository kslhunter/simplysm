import "@simplysm/sd-core";
import * as path from "path";
import * as fs from "fs-extra";
import * as ts from "typescript";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import {SdTypescriptUtils} from "../commons/SdTypescriptUtils";

const packageKey = process.argv[2];
const useScss = process.argv.slice(3).includes("scss");

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const parsedTsConfig = SdTypescriptUtils.getParsedConfig(contextPath);

const options = parsedTsConfig.options;

SdTypescriptUtils.watch(
  contextPath,
  parsedTsConfig.fileNames, options,
  false,
  (program, changedInfos) => {
    const diagnostics: ts.Diagnostic[] = [];
    for (const changedInfo of changedInfos) {
      if (changedInfo.type === "unlink") {
        const relativePath = path.relative(parsedTsConfig.options.rootDir!, changedInfo.filePath);
        const outPath = path.resolve(parsedTsConfig.options.outDir!, relativePath).replace(/\.ts$/, ".metadata.json");
        fs.removeSync(outPath);
      }
      else {
        const sourceFile = program.getSourceFile(changedInfo.filePath);
        if (!sourceFile) {
          continue;
        }

        const fileName = sourceFile.fileName;
        let content = sourceFile.getFullText();

        if (useScss) {
          content = SdTypescriptUtils.compileScss(fileName, content, false);
        }

        const newSourceFile = ts.createSourceFile(fileName, content, parsedTsConfig.options.target || ts.ScriptTarget.ES5);

        diagnostics.pushRange(
          SdTypescriptUtils.generateMetadata(newSourceFile, contextPath)
        );
      }
    }
    return diagnostics;

    /*const npmConfig = fs.readJsonSync(path.resolve(contextPath, "package.json"));
    return SdWorkerHelpers.generateMetadataBundle(npmConfig.name, parsedTsConfig.fileNames[0], contextPath);*/
  },
  message => {
    SdWorkerUtils.sendMessage({type: "error", message});
  },
  () => {
    SdWorkerUtils.sendMessage({type: "run"});
  },
  () => {
    SdWorkerUtils.sendMessage({type: "done"});
  }
);

