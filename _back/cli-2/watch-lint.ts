/*
import "@simplysm/sd-core";
import * as path from "path";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import {SdTypescriptUtils} from "../commons/SdTypescriptUtils";

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const parsedTsConfig = SdTypescriptUtils.getParsedConfig(contextPath);

const options = {
  ...parsedTsConfig.options,
  strictNullChecks: true
};

SdTypescriptUtils.watch(
  contextPath,
  parsedTsConfig.fileNames,
  options,
  (program, changedInfos) => {
    return {
      diagnostics: SdTypescriptUtils.lint(
        program,
        contextPath,
        changedInfos.filter(item => item.type !== "unlink")
          .map(item => program.getSourceFile(item.filePath))
          .filterExists()
      )
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
*/

import {SdTypescriptBuilder} from "../SdTypescriptBuilder";
import * as path from "path";
import * as os from "os";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";

const packageKey = process.argv[2];

const builder = new SdTypescriptBuilder(path.resolve(process.cwd(), "packages", packageKey, "tsconfig.build.json"));
builder.watch(changedInfos => {
  SdWorkerUtils.sendMessage({type: "run"});

  const messages = builder.lint(changedInfos.filter(item => item.type !== "dependency-scss").map(item => item.filePath));

  if (messages.length > 0) {
    SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL).trim()});
  }

  SdWorkerUtils.sendMessage({type: "done"});
}).catch(err => {
  SdWorkerUtils.sendMessage({type: "error", message: err});
});
