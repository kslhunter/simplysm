import { TransferableConvert, Uuid } from "@simplysm/core-common";
import { EventEmitter } from "events";
import path from "path";
import pino from "pino";
import { fileURLToPath } from "url";
import type { WorkerOptions } from "worker_threads";
import { Worker } from "worker_threads";
import type { SdWorkerRequest, SdWorkerType, SdWorkerResponse } from "./types";

const logger = pino({ name: "sd-worker" });

//#region SdWorker

/**
 * 타입 안전한 Worker 래퍼 클래스.
 * 메인 스레드에서 사용.
 *
 * @example
 * const worker = new SdWorker<MyWorkerType>("./my-worker.ts");
 *
 * worker.on("progress", (percent) => {
 *   console.log(`Progress: ${percent}%`);
 * });
 *
 * const result = await worker.run("calculate", [10, 20]);
 * await worker.killAsync();
 */
export class SdWorker<T extends SdWorkerType> extends EventEmitter {
  private readonly _worker: Worker;
  private _isTerminated = false;

  /**
   * @param filePath - 워커 파일 경로 (file:// URL 또는 절대 경로)
   * @param opt - Worker 옵션
   */
  constructor(filePath: string, opt?: Omit<WorkerOptions, "stdout" | "stderr">) {
    super();

    const ext = path.extname(import.meta.filename);

    // 개발 환경 (.ts 파일)인 경우 tsx를 통해 실행
    if (ext === ".ts") {
      this._worker = new Worker(
        path.resolve(import.meta.dirname, "../../lib/worker-dev-proxy.js"),
        {
          stdout: true,
          stderr: true,
          ...opt,
          env: {
            ...process.env,
            ...(opt?.env as Record<string, string>),
          },
          argv: [filePath, ...(opt?.argv ?? [])],
        },
      );
    } else {
      // 프로덕션 환경 (.js 파일)
      // file:// URL인 경우 변환, 이미 절대 경로인 경우 그대로 사용
      const workerPath = filePath.startsWith("file://") ? fileURLToPath(filePath) : filePath;
      this._worker = new Worker(workerPath, {
        stdout: true,
        stderr: true,
        ...opt,
        env: {
          ...process.env,
          ...(opt?.env as Record<string, string>),
        },
      });
    }

    // 워커의 stdout/stderr을 메인에 출력
    this._worker.stdout.pipe(process.stdout);
    this._worker.stderr.pipe(process.stderr);

    this._worker.on("exit", (code) => {
      if (!this._isTerminated && code !== 0) {
        logger.error({ code }, "워커가 오류와 함께 닫힘");
      }
    });

    this._worker.on("error", (err) => {
      logger.error({ err }, "워커 에러 발생");
    });

    this._worker.on("message", (serializedResponse: unknown) => {
      const response: SdWorkerResponse<T, string> = TransferableConvert.decode(
        serializedResponse,
      ) as SdWorkerResponse<T, string>;

      if (response.type === "event") {
        this.emit(response.event, response.body);
      } else if (response.type === "log") {
        process.stdout.write(response.body);
      }
    });
  }

  /**
   * 이벤트 리스너 등록.
   */
  override on<K extends keyof T["events"] & string>(
    event: K,
    listener: (args: T["events"][K]) => void,
  ): this {
    super.on(event, listener as (arg: unknown) => void);
    return this;
  }

  /**
   * 워커 메서드 실행.
   *
   * @param method - 실행할 메서드 이름
   * @param params - 메서드 파라미터
   * @returns 메서드 실행 결과
   */
  async run<K extends keyof T["methods"]>(
    method: K,
    params: T["methods"][K]["params"],
  ): Promise<T["methods"][K]["returnType"]> {
    return await new Promise<T["methods"][K]["returnType"]>((resolve, reject) => {
      const request: SdWorkerRequest<T, K> = {
        id: Uuid.new().toString(),
        method,
        params,
      };

      const callback = (serializedResponse: unknown) => {
        const response: SdWorkerResponse<T, K> = TransferableConvert.decode(
          serializedResponse,
        ) as SdWorkerResponse<T, K>;

        if (response.type === "return") {
          if (response.request.id === request.id) {
            this._worker.off("message", callback);
            // void 반환 타입에서 body가 undefined일 수 있으므로 as 사용
            // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
            resolve(response.body as T["methods"][K]["returnType"]);
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

  /**
   * 워커 종료.
   */
  async killAsync(): Promise<void> {
    this._isTerminated = true;
    await this._worker.terminate();
  }
}

//#endregion
