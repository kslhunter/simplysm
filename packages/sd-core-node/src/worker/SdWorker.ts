import cp, { ForkOptions } from "child_process";
import { fileURLToPath } from "url";
import { EventEmitter } from "events";
import { ISdWorkerRequest, ISdWorkerType, TSdWorkerResponse } from "./SdWorker.type";
import { JsonConvert, Uuid } from "@simplysm/sd-core-common";
import { Logger } from "../utils/Logger";

export class SdWorker<T extends ISdWorkerType> extends EventEmitter {
  #proc: cp.ChildProcess;

  constructor(filePath: string, opt?: Omit<ForkOptions, "stdio">) {
    super();

    const logger = Logger.get(["simplysm", "sd-cli", "SdChildProcessPool", "#createProcess"]);

    this.#proc = cp.fork(fileURLToPath(filePath), [], {
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      ...opt,
      env: {
        ...process.env,
        ...opt?.env,
      },
    });

    this.#proc.stdout!.pipe(process.stdout);
    this.#proc.stderr!.pipe(process.stderr);

    this.#proc.on("exit", (code) => {
      if (code != null && code !== 0) {
        const err = new Error(`오류와 함께 닫힘 (${code})`);
        logger.error(err);
        return;
      }
    });

    this.#proc.on("error", (err) => {
      logger.error(err);
    });

    this.#proc.on("message", (responseJson: string) => {
      const response: TSdWorkerResponse<T, string> = JsonConvert.parse(responseJson);
      if (response.type === "event") {
        this.emit(response.event, response.body);
      }
    });
  }

  override on<K extends keyof T["events"] & string>(event: K, listener: (args: T["events"][K]) => void): this;
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
            this.#proc.off("message", callback);
            resolve(response.body);
          }
        }
        else if (response.type === "error") {
          if (response.request.id === request.id) {
            this.#proc.off("message", callback);
            reject(response.body);
          }
        }
      };

      this.#proc.on("message", callback);
      this.#proc.send(JsonConvert.stringify(request));
    });
  }

  async killAsync() {
    await new Promise<void>((resolve) => {
      this.#proc.on("exit", () => {
        resolve();
      });
      this.#proc.kill("SIGKILL");
    });
  }
}
