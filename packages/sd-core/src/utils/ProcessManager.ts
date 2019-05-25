import * as child_process from "child_process";

export class ProcessManager {
  public static async spawnAsync(cmd: string, options?: {
    cwd?: string;
    logger?: {
      log: (message: Buffer | Uint8Array | string) => void;
      error: (message: Buffer | Uint8Array | string) => void;
    };
  }): Promise<void> {
    const cmds = cmd.split(" ");

    await new Promise<void>((resolve, reject) => {
      const opts: any = {
        shell: true,
        stdio: "pipe"
      };

      if (options && options.cwd) {
        opts.cwd = options.cwd;
      }

      const worker = child_process.spawn(cmds[0], cmds.slice(1), opts);

      worker.on("error", err => {
        reject(err);
      });

      worker.stdout.on("data", async (data: Buffer) => {
        if (options && options.logger) {
          try {
            options.logger.log(data.toString());
          }
          catch (err) {
            reject(err);
          }
        }
        else {
          process.stdout.write(data.toString("utf-8"));
        }
      });

      worker.stderr.on("data", async (data: Buffer) => {
        if (options && options.logger) {
          try {
            options.logger.error(data.toString());
          }
          catch (err) {
            reject(err);
          }
        }
        else {
          process.stderr.write(data.toString("utf-8"));
        }
      });

      worker.on("exit", async code => {
        if (code === 0) {
          resolve();
        }
        else {
          reject(new Error(`exit with code ${code}`));
        }
      });
    });
  }
}
