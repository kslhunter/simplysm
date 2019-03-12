import {Logger, optional} from "@simplysm/common";
import * as childProcess from "child_process";
import ProcessEnv = NodeJS.ProcessEnv;

export class ProcessManager {
  public static async spawnAsync(cmds: string[], opts?: { env?: ProcessEnv; cwd?: string; logger?: Logger; onMessage?(errMsg: string | undefined, logMsg: string | undefined): Promise<boolean | void> }): Promise<void> {
    if (opts && opts.logger) {
      opts.logger!.log(`$ ` + cmds.join(" "));
    }

    await new Promise<void>((resolve, reject) => {
      const worker = childProcess.spawn(cmds[0], cmds.slice(1), {
        shell: true,
        stdio: "pipe",
        env: optional(() => opts!.env),
        cwd: optional(() => opts!.cwd) || process.cwd()
      });

      worker.on("error", err => {
        if (opts && opts.logger) {
          opts.logger!.error(`$ ` + cmds.join(" "), err);
        }
        reject(err);
      });

      let resultMessage = "";
      worker.stdout!.on("data", async data => {
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
      worker.stderr!.on("data", async data => {
        errorMessage += data.toString();
        if (errorMessage.includes("\n")) {
          const newMessages = errorMessage.split("\n").map(item => `${item.replace(/\r/g, "")}`).slice(0, -1).filter(item => !!item);
          for (const newMessage of newMessages) {
            if (opts && opts.logger) {
              opts.logger!.log(newMessage);
            }
            if (opts && opts.onMessage && await opts.onMessage(undefined, newMessage)) {
              resolve();
            }
          }
          errorMessage = errorMessage.split("\n").slice(-1)[0].replace(/\r/g, "") || "";
        }
      });

      worker.on("exit", async code => {
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

      process.once("exit", () => {
        if (worker.connected) {
          childProcess.spawn("taskkill", ["/pid", worker.pid.toString(), "/f", "/t"]);
        }
      });
    });
  }

  public static async forkAsync(modulePath: string, cmds: string[], opts?: { env?: ProcessEnv; cwd?: string; logger?: Logger; onMessage?(message: any): Promise<boolean | void>; sendData?: any }): Promise<childProcess.ChildProcess> {
    if (opts && opts.logger) {
      opts.logger!.log(`$ node ${modulePath} ${cmds.join(" ")}`);
    }

    return await new Promise<childProcess.ChildProcess>((resolve, reject) => {
      const worker = childProcess.fork(
        modulePath,
        cmds,
        {
          stdio: ["inherit", "inherit", "inherit", "ipc"],
          env: optional(() => opts!.env),
          cwd: optional(() => opts!.cwd) || process.cwd()
        }
      );

      worker.on("error", err => {
        if (opts && opts.logger) {
          opts.logger!.log(err.message);
        }
        reject(err);
      });

      worker.on("message", async message => {
        try {
          if (opts && opts.onMessage && await opts.onMessage(message)) {
            resolve(worker);
          }
        }
        catch (err) {
          reject(err);
        }
      });

      if (opts && opts.sendData) {
        worker.send(opts.sendData, err => {
          if (err) {
            reject(err);
          }
        });
      }

      worker.on("exit", async code => {
        if (code === 0) {
          resolve(worker);
        }
        else {
          reject(new Error(code!.toString()));
        }
      });

      process.once("exit", () => {
        if (worker.connected) {
          childProcess.spawn("taskkill", ["/pid", worker.pid.toString(), "/f", "/t"]);
        }
      });
    });
  }
}