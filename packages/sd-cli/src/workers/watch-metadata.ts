import * as path from "path";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import {SdTypescriptProgram} from "../SdTypescriptProgram";
import * as os from "os";

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const tsConfigPath = path.resolve(contextPath, "tsconfig.build.json");


SdWorkerUtils.sendMessage({type: "run"});

const program = new SdTypescriptProgram(tsConfigPath, {
  replaceScssToCss: true
});
program.emitMetadata();

program
  .watch(
    changeInfos => {
      SdWorkerUtils.sendMessage({type: "run"});

      const messages = program.emitMetadata(changeInfos.map(item => item.filePath));
      if (messages.length > 0) {
        SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL).trim()});
      }

      SdWorkerUtils.sendMessage({type: "done"});
    },
    {}
  )
  .then(() => {
    SdWorkerUtils.sendMessage({type: "done"});
  })
  .catch(err => {
    SdWorkerUtils.sendMessage({type: "error", message: err.stack});
  });
