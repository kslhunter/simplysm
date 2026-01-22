import { SdEventEmitter, TransferableConvert, Uuid } from "@simplysm/core-common";
import path from "path";
import pino from "pino";
import { fileURLToPath } from "url";
import type { WorkerOptions } from "worker_threads";
import { Worker } from "worker_threads";
import type { SdWorkerModule, SdWorkerProxy, SdWorkerRequest, SdWorkerResponse } from "./types";

const logger = pino({ name: "sd-worker" });

//#region SdWorkerInternal

/**
 * Worker 내부 구현 클래스.
 * Proxy를 통해 외부에 노출됨.
 */
class SdWorkerInternal extends SdEventEmitter<Record<string, unknown>> {
  private readonly _worker: Worker;
  private _isTerminated = false;
  private readonly _pendingRequests = new Map<
    string,
    { reject: (err: Error) => void; callback: (msg: unknown) => void }
  >();

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

    // 워커의 stdout/stderr를 메인에 출력
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
      const response: SdWorkerResponse = TransferableConvert.decode(
        serializedResponse,
      ) as SdWorkerResponse;

      if (response.type === "event") {
        this.emit(response.event, response.body);
      } else if (response.type === "log") {
        process.stdout.write(response.body);
      }
    });
  }

  /**
   * 워커 메서드 호출.
   */
  call(method: string, params: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const request: SdWorkerRequest = {
        id: Uuid.new().toString(),
        method,
        params,
      };

      const callback = (serializedResponse: unknown) => {
        const response: SdWorkerResponse = TransferableConvert.decode(
          serializedResponse,
        ) as SdWorkerResponse;

        if (response.type === "return") {
          if (response.request.id === request.id) {
            this._worker.off("message", callback);
            this._pendingRequests.delete(request.id);
            resolve(response.body);
          }
        } else if (response.type === "error") {
          if (response.request.id === request.id) {
            this._worker.off("message", callback);
            this._pendingRequests.delete(request.id);
            reject(response.body);
          }
        }
      };

      this._pendingRequests.set(request.id, { reject, callback });
      this._worker.on("message", callback);

      const serialized = TransferableConvert.encode(request);
      this._worker.postMessage(serialized.result, serialized.transferList);
    });
  }

  /**
   * 워커 종료.
   */
  async terminate(): Promise<void> {
    this._isTerminated = true;

    // 대기 중인 모든 요청 정리
    for (const [_id, { reject, callback }] of this._pendingRequests) {
      this._worker.off("message", callback);
      reject(new Error("Worker terminated"));
    }
    this._pendingRequests.clear();

    await this._worker.terminate();
  }
}

//#endregion

//#region SdWorker

/**
 * 타입 안전한 Worker 래퍼.
 *
 * @example
 * // worker.ts
 * export default createSdWorker({
 *   add: (a: number, b: number) => a + b,
 * });
 *
 * // main.ts
 * const worker = SdWorker.create<typeof import("./worker")>("./worker.ts");
 * const result = await worker.add(10, 20);  // 30
 * await worker.terminate();
 */
export const SdWorker = {
  /**
   * 타입 안전한 Worker Proxy 생성.
   *
   * @param filePath - 워커 파일 경로 (file:// URL 또는 절대 경로)
   * @param opt - Worker 옵션
   * @returns Proxy 객체 (메서드 직접 호출, on(), terminate() 지원)
   */
  create<TModule extends SdWorkerModule>(
    filePath: string,
    opt?: Omit<WorkerOptions, "stdout" | "stderr">,
  ): SdWorkerProxy<TModule> {
    const internal = new SdWorkerInternal(filePath, opt);

    return new Proxy({} as SdWorkerProxy<TModule>, {
      get(_target, prop: string) {
        // 예약된 메서드: on, terminate
        if (prop === "on") {
          return (event: string, listener: (data: unknown) => void) => {
            internal.on(event, listener);
          };
        }
        if (prop === "terminate") {
          return () => internal.terminate();
        }

        // 그 외는 워커 메서드로 처리
        return (...args: unknown[]) => internal.call(prop, args);
      },
    });
  },
};

//#endregion
