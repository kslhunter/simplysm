/*
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
  (program, changedInfos) => {
    const diagnostics: ts.Diagnostic[] = [];
    const additionalDependencies: { fileName: string; dependencies: string[] }[] = [];
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
          const scssResult = SdTypescriptUtils.convertScssToCss(fileName, content, false);
          content = scssResult.content;
          additionalDependencies.push({
            fileName,
            dependencies: scssResult.dependencies
          });
        }

        const newSourceFile = ts.createSourceFile(fileName, content, parsedTsConfig.options.target || ts.ScriptTarget.ES5);

        diagnostics.pushRange(
          SdTypescriptUtils.generateMetadata(newSourceFile, contextPath)
        );
      }
    }
    return {
      diagnostics,
      additionalDependencies
    };

    /!*const npmConfig = fs.readJsonSync(path.resolve(contextPath, "package.json"));
    return SdWorkerHelpers.generateMetadataBundle(npmConfig.name, parsedTsConfig.fileNames[0], contextPath);*!/
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
*/


/*
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

    return {diagnostics};
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
*/

import {SdTypescriptBuilder} from "../SdTypescriptBuilder";
import * as path from "path";
import * as os from "os";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";

const packageKey = process.argv[2];

const builder = new SdTypescriptBuilder(path.resolve(process.cwd(), "packages", packageKey, "tsconfig.build.json"));
builder.watch(changedInfos => {
  SdWorkerUtils.sendMessage({type: "run"});

  const messages: string[] = [];
  for (const changedInfo of changedInfos) {
    messages.pushRange(builder.generateMetadata(changedInfo.filePath));
  }

  if (messages.length > 0) {
    SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL).trim()});
  }

  SdWorkerUtils.sendMessage({type: "done"});
}).catch(err => {
  SdWorkerUtils.sendMessage({type: "error", message: err});
});
