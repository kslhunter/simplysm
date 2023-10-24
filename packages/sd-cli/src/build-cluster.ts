import cluster from "node:cluster";
import {FsUtil, Logger, LoggerSeverity} from "@simplysm/sd-core-node";
import path from "path";
import {SdCliJsLibLinter} from "./builders/SdCliJsLibLinter";
import {EventEmitter} from "events";
import {ISdCliBuildClusterReqMessage, ISdCliBuildClusterResMessage} from "./commons";
import {NeverEntryError} from "@simplysm/sd-core-common";
import {SdCliServerBuilder} from "./builders/SdCliServerBuilder";
import {SdCliClientBuilder} from "./builders/SdCliClientBuilder";
import {SdCliTsLibBuilder} from "./builders/SdCliTsLibBuilder";

Error.stackTraceLimit = Infinity;
EventEmitter.defaultMaxListeners = 0;

if (Boolean(process.env["SD_DEBUG"])) {
  Logger.setConfig({
    console: {
      level: LoggerSeverity.debug
    }
  });
}
else {
  Logger.setConfig({
    dot: true
  });
}

const logger = Logger.get(["simplysm", "sd-cli", "build-cluster"]);

if (cluster.isPrimary) {
  cluster.schedulingPolicy = cluster.SCHED_RR;
  logger.debug(`메인 프로세스 ${process.pid} 시작`);

  cluster.on("exit", (worker, code) => {
    logger.debug(`워커 프로세스 ${worker.process.pid} 종료 (code: ${code})`);
  });

  cluster.on("message", (worker, message) => {
    sendMessage(message);
  });

  process.on("message", (message) => {
    cluster.fork({
      "SD_CLUSTER_MESSAGE": JSON.stringify(message)
    });
  });
  process.send!("ready");
}
else {
  const message = JSON.parse(process.env["SD_CLUSTER_MESSAGE"]!) as ISdCliBuildClusterReqMessage;
  const pkgConf = message.projConf.packages[path.basename(message.pkgPath)]!;

  if (message.cmd === "watch") {
    // [library] javascript
    if (pkgConf.type === "library" && !FsUtil.exists(path.resolve(message.pkgPath, "tsconfig.json"))) {
      await new SdCliJsLibLinter(message.pkgPath)
        .on("change", () => {
          sendMessage({
            type: "change",
            req: message
          });
        })
        .on("complete", (result) => {
          sendMessage({
            type: "complete",
            result,
            req: message
          });
        })
        .watchAsync();

      sendMessage({
        type: "ready",
        req: message
      });
    }
    // [library] typescript
    else if (pkgConf.type === "library" && FsUtil.exists(path.resolve(message.pkgPath, "tsconfig.json"))) {
      await new SdCliTsLibBuilder(message.projConf, message.pkgPath)
        .on("change", () => {
          sendMessage({
            type: "change",
            req: message
          });
        })
        .on("complete", (result) => {
          sendMessage({
            type: "complete",
            result,
            req: message
          });
        })
        .watchAsync();
      sendMessage({
        type: "ready",
        req: message
      });
    }
    // [server]
    else if (pkgConf.type === "server") {
      await new SdCliServerBuilder(message.projConf, message.pkgPath)
        .on("change", () => {
          sendMessage({
            type: "change",
            req: message
          });
        })
        .on("complete", (result) => {
          sendMessage({
            type: "complete",
            result,
            req: message
          });
        })
        .watchAsync();
      sendMessage({
        type: "ready",
        req: message
      });
    }
    // [client]
    else if (pkgConf.type === "client") {
      await new SdCliClientBuilder(message.projConf, message.pkgPath)
        .on("change", () => {
          sendMessage({
            type: "change",
            req: message
          });
        })
        .on("complete", (result) => {
          sendMessage({
            type: "complete",
            result,
            req: message
          });
        })
        .watchAsync();
      sendMessage({
        type: "ready",
        req: message
      });
    }
    else {
      throw new NeverEntryError();
    }
  }
  else { // build
    // [library] javascript
    if (pkgConf.type === "library" && !FsUtil.exists(path.resolve(message.pkgPath, "tsconfig.json"))) {
      const result = await new SdCliJsLibLinter(message.pkgPath).buildAsync();
      sendMessage({
        type: "complete",
        result,
        req: message
      });
    }
    // [library] typescript
    else if (pkgConf.type === "library" && FsUtil.exists(path.resolve(message.pkgPath, "tsconfig.json"))) {
      const result = await new SdCliTsLibBuilder(message.projConf, message.pkgPath).buildAsync();
      sendMessage({
        type: "complete",
        result,
        req: message
      });
    }
    // [server]
    else if (pkgConf.type === "server") {
      const result = await new SdCliServerBuilder(message.projConf, message.pkgPath).buildAsync();
      sendMessage({
        type: "complete",
        result,
        req: message
      });
    }
    // [client]
    else if (pkgConf.type === "client") {
      const result = await new SdCliClientBuilder(message.projConf, message.pkgPath).buildAsync();
      sendMessage({
        type: "complete",
        result,
        req: message
      });
    }
    else {
      throw new NeverEntryError();
    }
  }
}

function sendMessage(message: ISdCliBuildClusterResMessage): void {
  process.send!(message);
}
