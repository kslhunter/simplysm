import * as cp from "child_process";
import { Iconv } from "iconv";
import { NeverEntryError, SdError, Wait } from "@simplysm/sd-core-common";
import * as os from "os";

export class SdProcessManager {
  public static async spawnAsync(
    commandFullText: string,
    options?: { cwd?: string; env?: NodeJS.ProcessEnv },
    messageHandler?: ((message: string) => boolean | void | Promise<boolean> | Promise<void>) | false,
    errorMessageHandler?: ((errorMessage: string) => boolean | void | Promise<boolean> | Promise<void>) | false
  ): Promise<string> {
    const commands = commandFullText.split(" ");

    return await new Promise<string>((resolve, reject) => {
      const opts: cp.SpawnOptionsWithoutStdio = {
        shell: true,
        stdio: "pipe",
        ...options
      };

      const worker = cp.spawn(commands[0], commands.slice(1), opts);
      worker.on("error", (err) => {
        reject(err);
      });

      let message = "";
      let processing = false;
      let forceClosing = false;

      const iconv = new Iconv("CP949", "UTF-8");

      worker.stdout.on("data", async (data: Buffer) => {
        await Wait.true(() => !processing);
        if (forceClosing) {
          return;
        }

        processing = true;

        try {
          const msg = iconv.convert(data).toString().trim();
          message += msg + os.EOL;

          if (messageHandler !== undefined && messageHandler !== false) {
            const handlerResult = await messageHandler(msg);
            if (handlerResult) {
              cp.spawnSync("taskkill", ["/pid", worker.pid.toString(), "/f", "/t"], { cwd: opts.cwd });
              forceClosing = true;
            }
          }
          else if (messageHandler !== false) {
            process.stdout.write(data.toString());
          }
        }
        catch (err) {
          reject(new SdError(err, data.toString()));
        }

        processing = false;
      });

      worker.stderr.on("data", async (data: Buffer) => {
        await Wait.true(() => !processing);
        if (forceClosing) {
          return;
        }

        processing = true;

        try {
          const msg = iconv.convert(data).toString().trim();
          message += msg + os.EOL;

          if (errorMessageHandler !== undefined && errorMessageHandler !== false) {
            const handlerResult = await errorMessageHandler(msg);
            if (handlerResult) {
              cp.spawnSync("taskkill", ["/pid", worker.pid.toString(), "/f", "/t"]);
              forceClosing = true;
            }
          }
          else if (errorMessageHandler !== false) {
            process.stderr.write(data.toString());
          }
        }
        catch (err) {
          reject(new SdError(err, data.toString()));
        }

        processing = false;
      });

      worker.on("exit", async (code) => {
        await Wait.true(() => !processing);

        if (code === 0 || forceClosing) {
          resolve(message.length > 0 ? message.slice(0, -2) : message);
        }
        else {
          reject(new Error((message.length > 0 ? message.slice(0, -2) : message) + os.EOL + os.EOL + `: exit with code ${code ?? ""}`));
        }
      });
    });
  }

  public static fork(
    binPath: string,
    args: string[],
    options?: { cwd?: string; env?: NodeJS.ProcessEnv; execArgv?: string[] }
  ): cp.ChildProcess {
    const opts: cp.ForkOptions = {
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      ...options
    };

    const worker = cp.fork(binPath, args, opts);

    let processing = false;

    if (!worker.stdout || !worker.stderr) {
      throw new NeverEntryError();
    }

    worker.stdout.on("data", async (data: Buffer) => {
      await Wait.true(() => !processing);
      processing = true;
      process.stdout.write(data.toString());
      processing = false;
    });

    worker.stderr.on("data", async (data: Buffer) => {
      await Wait.true(() => !processing);
      processing = true;
      process.stderr.write(data.toString());
      processing = false;
    });

    return worker;
  }
}
