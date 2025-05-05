import cp, { ForkOptions } from "child_process";
import { fileURLToPath } from "url";
import { EventEmitter } from "events";
import { ISdWorkerRequest, ISdWorkerType, TSdWorkerResponse } from "./sd-worker.types";
import { JsonConvert, Uuid } from "@simplysm/sd-core-common";
import { SdLogger } from "../utils/sd-logger";

export class SdWorker<T extends ISdWorkerType> extends EventEmitter {
  private _proc: cp.ChildProcess;

  constructor(filePath: string, opt?: Omit<ForkOptions, "stdio">) {
    super();

    const logger = SdLogger.get(["simplysm", "sd-cli", "SdChildProcessPool", "#createProcess"]);

    this._proc = cp.fork(fileURLToPath(filePath), [], {
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      ...opt,
      env: {
        ...process.env,
        ...opt?.env,
      },
    });

    this._proc.stdout!.pipe(process.stdout);
    this._proc.stderr!.pipe(process.stderr);

    this._proc.on("exit", (code) => {
      if (code != null && code !== 0) {
        const err = new Error(`오류와 함께 닫힘 (${code})`);
        logger.error(err);
        return;
      }
    });

    this._proc.on("error", (err) => {
      logger.error(err);
    });

    this._proc.on("message", (responseJson: string) => {
      const response: TSdWorkerResponse<T, string> = JsonConvert.parse(responseJson);
      if (response.type === "event") {
        this.emit(response.event, response.body);
      }
    });
  }

  override on<K extends keyof T["events"] & string>(
    event: K,
    listener: (args: T["events"][K]) => void,
  ): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  async run<K extends keyof T["methods"]>(
    method: K,
    params: T["methods"][K]["params"],
  ): Promise<T["methods"][K]["returnType"]> {
    return await new Promise<T["methods"][K]["returnType"]>((resolve, reject) => {
      const request: ISdWorkerRequest<T, K> = { id: Uuid.new().toString(), method, params };
      const callback = (responseJson: string) => {
        const response: TSdWorkerResponse<T, K> = JsonConvert.parse(responseJson);
        if (response.type === "return") {
          if (response.request.id === request.id) {
            this._proc.off("message", callback);
            resolve(response.body);
          }
        }
        else if (response.type === "error") {
          if (response.request.id === request.id) {
            this._proc.off("message", callback);
            reject(response.body);
          }
        }
      };

      this._proc.on("message", callback);
      this._proc.send(JsonConvert.stringify(request));
    });
  }

  async killAsync() {
    await new Promise<void>((resolve) => {
      this._proc.on("exit", () => {
        resolve();
      });
      this._proc.kill("SIGKILL");
    });
  }
}
