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
  true,
  (program, changedInfos) => {
    return SdTypescriptUtils.lint(
      program,
      contextPath,
      changedInfos.filter(item => item.type !== "unlink")
        .map(item => program.getSourceFile(item.filePath))
        .filterExists()
    );
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
