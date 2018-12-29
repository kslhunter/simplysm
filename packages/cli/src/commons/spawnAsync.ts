import * as childProcess from "child_process";
import {Logger, optional} from "@simplism/core";
import ProcessEnv = NodeJS.ProcessEnv;

export async function spawnAsync(logger: Logger, cmds: string[], opts?: { env?: ProcessEnv; cwd?: string }): Promise<{ message: string; errorMessage: string }> {
  return await new Promise<{ message: string; errorMessage: string }>((resolve, reject) => {
    const worker = childProcess.spawn(cmds[0], cmds.slice(1), {
      shell: true,
      stdio: "pipe",
      env: optional(opts, o => o.env),
      cwd: optional(opts, o => o.cwd) || process.cwd()
    });

    let resultMessage = "";
    worker.stdout.on("data", data => {
      resultMessage += data.toString();
      if (resultMessage.includes("\n")) {
        const newMessages = resultMessage.split("\n").map(item => `${item.replace(/\r/g, "")}`).slice(0, -1).filter(item => !!item);
        for (const newMessage of newMessages) {
          logger.log(newMessage);
        }
        resultMessage = resultMessage.split("\n").slice(-1)[0].replace(/\r/g, "") || "";
      }
    });

    let errorMessage = "";
    worker.stderr.on("data", data => {
      errorMessage += data.toString();
      if (errorMessage.includes("\n")) {
        const newMessages = errorMessage.split("\n").map(item => `${item.replace(/\r/g, "")}`).slice(0, -1).filter(item => !!item);
        for (const newMessage of newMessages) {
          logger.log(newMessage);
        }
        errorMessage = errorMessage.split("\n").slice(-1)[0].replace(/\r/g, "") || "";
      }
    });

    worker.on("close", code => {
      if (errorMessage.replace(/\r/g, "")) {
        logger.error(errorMessage);
      }
      if (resultMessage.replace(/\r/g, "")) {
        logger.log(resultMessage);
      }

      if (code === 0) {
        resolve();
      }
      else {
        reject(new Error());
      }
    });
  });
}