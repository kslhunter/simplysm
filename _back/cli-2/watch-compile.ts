/*
import * as ts from "typescript";
import * as path from "path";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import * as fs from "fs-extra";
import {SdTypescriptUtils} from "../commons/SdTypescriptUtils";
import {SdCliUtils} from "../commons/SdCliUtils";

const packageKey = process.argv[2];
const opts = process.argv[3] ? process.argv[3].split(",").map(item => item.trim()) : undefined;
const useScss = process.argv.slice(4).includes("scss");

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const parsedTsConfig = SdTypescriptUtils.getParsedConfig(contextPath);

const options = parsedTsConfig.options;

SdTypescriptUtils.watch(
  contextPath,
  parsedTsConfig.fileNames,
  options,
  (program, changedInfos) => {
    const diagnostics: ts.Diagnostic[] = [];
    const additionalDependencies: { fileName: string; dependencies: string[] }[] = [];
    for (const changedInfo of changedInfos) {
      if (changedInfo.type === "unlink") {
        const relativePath = path.relative(parsedTsConfig.options.rootDir!, changedInfo.filePath);
        const outPath = path.resolve(parsedTsConfig.options.outDir!, relativePath).replace(/\.ts$/, ".js");
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

        diagnostics.pushRange(
          SdTypescriptUtils.compile(fileName, content, options)
        );
      }
    }

    return {
      diagnostics,
      additionalDependencies
    };
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

const config = SdCliUtils.getConfigObj("development", opts).packages[packageKey];
fs.writeFileSync(path.resolve(parsedTsConfig.options.outDir!, ".configs.json"), JSON.stringify({env: "development", ...config.configs}, undefined, 2));
*/

import {SdTypescriptBuilder} from "../SdTypescriptBuilder";
import * as path from "path";
import * as os from "os";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import {SdCliUtils} from "../commons/SdCliUtils";
import * as fs from "fs-extra";

const packageKey = process.argv[2];
const opts = process.argv[3] ? process.argv[3].split(",").map(item => item.trim()) : undefined;

const builder = new SdTypescriptBuilder(path.resolve(process.cwd(), "packages", packageKey, "tsconfig.build.json"));
builder.watch(changedInfos => {
  SdWorkerUtils.sendMessage({type: "run"});

  const messages: string[] = [];
  for (const changedInfo of changedInfos.filter(item => item.type !== "dependency")) {
    messages.pushRange(builder.compile(changedInfo.filePath));
  }

  if (messages.length > 0) {
    SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL).trim()});
  }

  SdWorkerUtils.sendMessage({type: "done"});
}).catch(err => {
  SdWorkerUtils.sendMessage({type: "error", message: err});
});

const config = SdCliUtils.getConfigObj("development", opts).packages[packageKey];
fs.writeFileSync(path.resolve(builder.outDir, ".configs.json"), JSON.stringify({env: "development", ...config.configs}, undefined, 2));

