import * as child_process from "child_process";
import {Iconv} from "iconv";
import {Wait} from "@simplysm/sd-core-common";

export class ProcessManager {
  public static async spawnAsync(
    commandFullText: string,
    options?: { cwd?: string; env?: NodeJS.ProcessEnv },
    messageHandler?: (message: string) => boolean | void | Promise<boolean> | Promise<void>,
    errorMessageHandler?: (errorMessage: string) => boolean | void | Promise<boolean> | Promise<void>
  ): Promise<string> {
    const commands = commandFullText.split(" ");

    return await new Promise<string>((resolve, reject) => {
      const opts: child_process.SpawnOptionsWithoutStdio = {
        shell: true,
        stdio: "pipe",
        ...options
      };

      const worker = child_process.spawn(commands[0], commands.slice(1), opts);
      worker.on("error", (err) => {
        reject(err);
      });

      let message = "";
      let processing = false;
      let forceClosing = false;

      const iconv = new Iconv("CP949", "UTF-8");

      worker.stdout.on("data", async (data: Buffer) => {
        await Wait.true(() => !processing);
        if (forceClosing) return;

        processing = true;

        try {
          const msg = iconv.convert(data).toString().trim();
          message += msg + "\r\n";

          if (messageHandler) {
            const handlerResult = await messageHandler(msg);
            if (handlerResult) {
              child_process.spawnSync("taskkill", ["/pid", worker.pid.toString(), "/f", "/t"], {cwd: opts.cwd});
              forceClosing = true;
            }
          }
          else {
            process.stdout.write(data.toString());
          }
        }
        catch (err) {
          reject(err);
        }

        processing = false;
      });

      worker.stderr.on("data", async (data: Buffer) => {
        await Wait.true(() => !processing);
        if (forceClosing) return;

        processing = true;

        try {
          const msg = iconv.convert(data).toString().trim();
          message += msg + "\r\n";

          if (errorMessageHandler) {
            const handlerResult = await errorMessageHandler(msg);
            if (handlerResult) {
              child_process.spawnSync("taskkill", ["/pid", worker.pid.toString(), "/f", "/t"]);
              forceClosing = true;
            }
          }
          else {
            process.stderr.write(data.toString());
          }
        }
        catch (err) {
          reject(err);
        }

        processing = false;
      });

      worker.on("exit", async (code) => {
        await Wait.true(() => !processing);

        if (code === 0 || forceClosing) {
          resolve(message ? message.slice(0, -2) : message);
        }
        else {
          reject(new Error(`exit with code ${code}`));
        }
      });
    });
  }
}