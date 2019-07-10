import * as path from "path";
import {SdWorkerUtils} from "../commons/SdWorkerUtils";
import {SdTypescriptProgram} from "../SdTypescriptProgram";
import * as os from "os";

const packageKey = process.argv[2];

const contextPath = path.resolve(process.cwd(), "packages", packageKey);
const tsConfigPath = path.resolve(contextPath, "tsconfig.build.json");

SdWorkerUtils.sendMessage({type: "run"});

const program = new SdTypescriptProgram(tsConfigPath, {});
program.lint();

program
  .watch(
    changeInfos => {
      SdWorkerUtils.sendMessage({type: "run"});

      const messages = program.lint(changeInfos.map(item => item.filePath));
      if (messages.length > 0) {
        SdWorkerUtils.sendMessage({type: "error", message: messages.distinct().join(os.EOL).trim()});
      }

      SdWorkerUtils.sendMessage({type: "done"});
    },
    {
      millisecond: 1000
    }
  )
  .then(() => {
    SdWorkerUtils.sendMessage({type: "done"});
  })
  .catch(err => {
    SdWorkerUtils.sendMessage({type: "error", message: err.stack});
  });

/*
SdWorkerUtils.sendMessage({type: "run"});

const builder = new SdTypescriptBuilder(tsConfigPath);
builder.watch(
  changedInfos => {
    const messages = builder.lint(changedInfos.filter(item => item.type !== "embed-dependency").map(item => item.filePath));

    if (messages.length > 0) {
      SdWorkerUtils.sendMessage({type: "warning", message: messages.distinct().join(os.EOL).trim()});
    }

    SdWorkerUtils.sendMessage({type: "done"});
  },
  () => {
    SdWorkerUtils.sendMessage({type: "run"});
  }
).catch(err => {
  SdWorkerUtils.sendMessage({type: "error", message: err.stack});
});
*/
