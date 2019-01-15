import * as childProcess from "child_process";
import {Logger, optional} from "@simplysm/common";
import ProcessEnv = NodeJS.ProcessEnv;

export async function spawnAsync(cmds: string[], opts?: { env?: ProcessEnv; cwd?: string; logger?: Logger; onMessage?(errMsg: string | undefined, logMsg: string | undefined): Promise<boolean | void> }): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const worker = childProcess.spawn(cmds[0], cmds.slice(1), {
      shell: true,
      stdio: "pipe",
      env: optional(opts, o => o.env),
      cwd: optional(opts, o => o.cwd) || process.cwd()
    });

    let resultMessage = "";
    worker.stdout.on("data", async data => {
      resultMessage += data.toString();
      if (resultMessage.includes("\n")) {
        const newMessages = resultMessage.split("\n").map(item => `${item.replace(/\r/g, "")}`).slice(0, -1).filter(item => !!item);
        for (const newMessage of newMessages) {
          if (opts && opts.logger) {
            opts.logger!.log(newMessage);
          }
          if (opts && opts.onMessage && await opts.onMessage(undefined, newMessage)) {
            resolve();
          }
        }
        resultMessage = resultMessage.split("\n").slice(-1)[0].replace(/\r/g, "") || "";
      }
    });

    let errorMessage = "";
    worker.stderr.on("data", async data => {
      errorMessage += data.toString();
      if (errorMessage.includes("\n")) {
        const newMessages = errorMessage.split("\n").map(item => `${item.replace(/\r/g, "")}`).slice(0, -1).filter(item => !!item);
        for (const newMessage of newMessages) {
          if (opts && opts.logger) {
            opts.logger!.error(newMessage);
          }
          if (opts && opts.onMessage && await opts.onMessage(undefined, newMessage)) {
            resolve();
          }
        }
        errorMessage = errorMessage.split("\n").slice(-1)[0].replace(/\r/g, "") || "";
      }
    });

    worker.on("close", async code => {
      if (opts && opts.logger) {
        if (errorMessage.replace(/\r/g, "")) {
          opts.logger!.error(errorMessage);
        }
        if (resultMessage.replace(/\r/g, "")) {
          opts.logger!.log(resultMessage);
        }
      }
      if (opts && opts.onMessage && (errorMessage.replace(/\r/g, "") || resultMessage.replace(/\r/g, ""))) {
        await opts.onMessage(
          errorMessage.replace(/\r/g, "") ? errorMessage : undefined,
          resultMessage.replace(/\r/g, "") ? resultMessage : undefined
        );
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
