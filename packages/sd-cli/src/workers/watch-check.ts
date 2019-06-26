import "@simplysm/sd-core";
import * as path from "path";
import * as ts from "typescript";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import * as fs from "fs-extra";
import {SdTypescriptUtils} from "../commons/SdTypescriptUtils";

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const parsedTsConfig = SdTypescriptUtils.getParsedConfig(contextPath);

const options = {
  ...parsedTsConfig.options,
  skipLibCheck: true,
  noEmit: !parsedTsConfig.options.declaration,
  emitDeclarationOnly: parsedTsConfig.options.declaration,
  emitOnlyDtsFiles: parsedTsConfig.options.declaration
};

SdTypescriptUtils.watch(
  contextPath,
  parsedTsConfig.fileNames,
  options,
  true,
  (program, changedInfos) => {
    const diagnostics: ts.Diagnostic[] = [];
    for (const changedInfo of changedInfos) {
      if (changedInfo.type === "unlink") {
        const relativePath = path.relative(parsedTsConfig.options.rootDir!, changedInfo.filePath);

        const outPath = path.resolve(parsedTsConfig.options.outDir!, relativePath).replace(/\.ts$/, ".d.ts");
        fs.removeSync(outPath);

        const mapPath = path.resolve(parsedTsConfig.options.outDir!, relativePath).replace(/\.ts$/, ".js.map");
        fs.removeSync(mapPath);
      }
      else {
        const sourceFile = program.getSourceFile(changedInfo.filePath);
        if (!sourceFile) {
          continue;
        }

        if (changedInfo.type === "check") {
          program.getSemanticDiagnostics(sourceFile).concat(program.getSyntacticDiagnostics(sourceFile));
        }
        else {
          diagnostics.pushRange(
            ts.getPreEmitDiagnostics(program, sourceFile).concat(program.emit(sourceFile).diagnostics)
          );
        }
      }
    }

    return diagnostics;
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
