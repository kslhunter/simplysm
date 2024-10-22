import { FsUtil, SdProcess } from "@simplysm/sd-core-node";
import path from "path";
import pm2 from "pm2";

export class Pm2Promise {
  static async connectAsync<R>(fn: () => Promise<R>): Promise<R> {
    return await new Promise<R>((resolve, reject) => {
      pm2.connect(async (err: Error | undefined) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          const result = await fn();

          pm2.disconnect();
          resolve(result);
        } catch (err1) {
          reject(err1);
        }
      });
    });
  }

  static async listAsync() {
    return await new Promise<pm2.ProcessDescription[]>((resolve, reject) => {
      pm2.list((err: Error | undefined, list: pm2.ProcessDescription[]) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(list);
      });
    });
  }

  static async killAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      pm2.killDaemon((err: Error | undefined) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  static async startAsync(options?: { cwd?: string }): Promise<pm2.Proc> {
    const npmConfig = FsUtil.readJson(path.resolve(options?.cwd ?? process.cwd(), "package.json"));
    const servConf = FsUtil.readJson(path.resolve(options?.cwd ?? process.cwd(), `sd-serv.json`));

    const nodePath = await SdProcess.spawnAsync("volta which node", {
      cwd: options?.cwd ?? process.cwd(),
    });

    return await new Promise<pm2.Proc>((resolve, reject) => {
      pm2.start(
        {
          name: servConf.name ?? npmConfig.name.replace(/@/g, "").replace(/\//g, "-"),
          cwd: options?.cwd ?? process.cwd(),
          script: "main.js",
          watch: true,
          watch_delay: 2000,
          ignore_watch: ["node_modules", "www", ...(servConf.ignoreWatchPaths ?? [])],
          interpreter: nodePath.trim(),
          interpreter_args: "--openssl-config=openssl.cnf",
          env: {
            NODE_ENV: "production",
            TZ: "Asia/Seoul",
            SD_VERSION: npmConfig.version,
            ...servConf.env,
          },
          arrayProcess: "concat",
          useDelTargetNull: true,
        } as pm2.StartOptions,
        (err: Error | Error[] | undefined, proc: pm2.Proc) => {
          if (err) {
            reject(err instanceof Array ? err[0] : err);
            return;
          }

          resolve(proc);
        },
      );
    });
  }

  static async stopAsync(id: number) {
    return await new Promise<pm2.Proc>((resolve, reject) => {
      pm2.stop(id, (err: Error | undefined, proc: pm2.Proc) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(proc);
      });
    });
  }

  static async restartAsync(id: number) {
    return await new Promise<pm2.Proc>((resolve, reject) => {
      pm2.restart(id, (err: Error | undefined, proc: pm2.Proc) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(proc);
      });
    });
  }

  static async deleteAsync(id: number) {
    return await new Promise<pm2.Proc>((resolve, reject) => {
      pm2.delete(id, (err: Error | undefined, proc: pm2.Proc) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(proc);
      });
    });
  }
}
