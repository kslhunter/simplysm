import * as child_process from "child_process";

export class ProcessManager {
  public static async spawnAsync(cmd: string, options?: {
    cwd?: string;
    logger?: {
      log: (message: string) => void;
      error: (message: string) => void;
    };
    env?: NodeJS.ProcessEnv;
  }): Promise<void> {
    const cmds = cmd.split(" ");

    await new Promise<void>((resolve, reject) => {
      const opts: child_process.SpawnOptionsWithoutStdio = {
        shell: true,
        stdio: "pipe"
      };

      if (options && options.cwd) {
        opts.cwd = options.cwd;
      }

      if (options && options.env) {
        opts.env = options.env;
      }

      const worker = child_process.spawn(cmds[0], cmds.slice(1), opts);

      worker.on("error", err => {
        reject(err);
      });

      worker.stdout.on("data", (data: Buffer) => {
        if (options && options.logger) {
          try {
            options.logger.log(data.toString().trim());
          }
          catch (err) {
            reject(err);
          }
        }
        else {
          process.stdout.write(data.toString("utf-8"));
        }
      });

      worker.stderr.on("data", (data: Buffer) => {
        if (options && options.logger) {
          try {
            options.logger.error(data.toString().trim());
          }
          catch (err) {
            reject(err);
          }
        }
        else {
          process.stderr.write(data.toString("utf-8"));
        }
      });

      worker.on("exit", code => {
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
