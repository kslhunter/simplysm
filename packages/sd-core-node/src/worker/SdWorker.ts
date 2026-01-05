import { TransferableConvert, Uuid } from "@simplysm/sd-core-common";
import { EventEmitter } from "events";
import path from "path";
import { fileURLToPath } from "url";
import type { WorkerOptions } from "worker_threads";
import { Worker } from "worker_threads";
import { SdLogger } from "../utils/SdLogger";
import type { ISdWorkerRequest, ISdWorkerType, TSdWorkerResponse } from "./types";

export class SdWorker<T extends ISdWorkerType> extends EventEmitter {
  private readonly _worker: Worker;

  private _isTerminated = false;

  constructor(filePath: string, opt?: Omit<WorkerOptions, "stdout" | "stderr">) {
    super();

    const logger = SdLogger.get(["simplysm", "sd-cli", "SdWorker"]);

    const ext = path.extname(import.meta.filename);
    if (ext === ".ts") {
      this._worker = new Worker(
        path.resolve(import.meta.dirname, "../../lib/worker-dev-proxy.js"),
        {
          stdout: true,
          stderr: true,
          ...opt,
          env: {
            ...process.env,
            ...(opt?.env as any),
          },
          argv: [filePath, ...(opt?.argv ?? [])],
        },
      );
    } else {
      this._worker = new Worker(fileURLToPath(filePath), {
        stdout: true,
        stderr: true,
        ...opt,
        env: {
          ...process.env,
          ...(opt?.env as any),
        },
      });
    }

    // 워커의 stdout/stderr을 메인에 출력
    this._worker.stdout.pipe(process.stdout);
    this._worker.stderr.pipe(process.stderr);

    this._worker.on("exit", (code) => {
      if (!this._isTerminated && code !== 0) {
        const err = new Error(`오류와 함께 닫힘 (CODE: ${code})`);
        logger.error(err);
      }
    });

    this._worker.on("error", (err) => {
      logger.error(err);
    });

    this._worker.on("message", (serializedResponse: any) => {
      const response: TSdWorkerResponse<T, string> = TransferableConvert.decode(serializedResponse);
      if (response.type === "event") {
        this.emit(response.event, response.body);
      } else if (response.type === "log") {
        process.stdout.write(response.body);
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
      const callback = (serializedResponse: any) => {
        const response: TSdWorkerResponse<T, K> = TransferableConvert.decode(serializedResponse);
        if (response.type === "return") {
          if (response.request.id === request.id) {
            this._worker.off("message", callback);
            resolve(response.body);
          }
        } else if (response.type === "error") {
          if (response.request.id === request.id) {
            this._worker.off("message", callback);
            reject(response.body);
          }
        }
      };

      this._worker.on("message", callback);
      const serialized = TransferableConvert.encode(request);
      this._worker.postMessage(serialized.result, serialized.transferList);
    });
  }

  async killAsync() {
    this._isTerminated = true;
    await this._worker.terminate();
  }
}
