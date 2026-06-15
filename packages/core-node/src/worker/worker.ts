import { EventEmitter, transfer, Uuid } from "@simplysm/core-common";
import { createLogger } from "@simplysm/core-common";
import path from "path";
import { fileURLToPath } from "url";
import type { WorkerOptions as WorkerRawOptions } from "worker_threads";
import { Worker as WorkerRaw } from "worker_threads";
import type { WorkerModule, WorkerProxy, WorkerRequest, WorkerResponse } from "./types";

const logger = createLogger("sd-worker");

//#region WorkerInternal

/**
 * Worker의 내부 구현 클래스.
 * Proxy를 통해 외부에 노출된다.
 *
 * 개발 환경(.ts 파일)에서는 TypeScript 워커 파일을 tsx를 통해 실행한다.
 * 프로덕션 환경(.js 파일)에서는 Worker를 직접 생성한다.
 */
class WorkerInternal extends EventEmitter<Record<string, unknown>> {
  private readonly _worker: WorkerRaw;
  private _isTerminated = false;
  private readonly _pendingRequests = new Map<
    string,
    { method: string; resolve: (value: unknown) => void; reject: (err: Error) => void }
  >();

  constructor(filePath: string, opt?: Omit<WorkerRawOptions, "stdout" | "stderr">) {
    super();

    const ext = path.extname(import.meta.filename);

    // 타입 가드를 통해 env 객체 추출
    const envObj = opt?.env != null && typeof opt.env === "object" ? opt.env : {};

    // 개발 환경(.ts 파일)에서는 tsx를 통해 실행
    // worker-dev-proxy.js: tsx를 통해 TypeScript 워커 파일을 동적으로 로드하는 프록시
    if (ext === ".ts") {
      // file:// URL이면 절대 경로로 변환 (worker-dev-proxy.js가 다시 pathToFileURL을 적용)
      const workerPath = filePath.startsWith("file://") ? fileURLToPath(filePath) : filePath;
      this._worker = new WorkerRaw(
        path.resolve(import.meta.dirname, "../../lib/worker-dev-proxy.js"),
        {
          stdout: true,
          stderr: true,
          ...opt,
          env: {
            // eslint-disable-next-line no-restricted-properties -- 자식 프로세스에 env 전달
            ...process.env,
            ...envObj,
          },
          argv: [workerPath, ...(opt?.argv ?? [])],
        },
      );
    } else {
      // 프로덕션 환경 (.js 파일)
      // file:// URL이면 변환; 그렇지 않으면 절대 경로를 그대로 사용
      const workerPath = filePath.startsWith("file://") ? fileURLToPath(filePath) : filePath;
      this._worker = new WorkerRaw(workerPath, {
        stdout: true,
        stderr: true,
        ...opt,
        env: {
          // eslint-disable-next-line no-restricted-properties -- 자식 프로세스에 env 전달
          ...process.env,
          ...envObj,
        },
      });
    }

    // 워커의 stdout/stderr를 메인 프로세스로 파이프
    this._worker.stdout.pipe(process.stdout);
    this._worker.stderr.pipe(process.stderr);

    this._worker.on("exit", (code) => {
      if (!this._isTerminated && code !== 0) {
        logger.error(`워커가 비정상 종료되었습니다 (코드: ${code})`);
        // 비정상 종료 시 대기 중인 모든 요청을 거부
        this._rejectAllPending(new Error(`워커가 비정상 종료되었습니다 (코드: ${code})`));
      }
    });

    this._worker.on("error", (err) => {
      logger.error("워커 오류:", err);
      // 워커 오류 시 대기 중인 모든 요청을 거부
      this._rejectAllPending(err);
    });

    this._worker.on("message", (serializedResponse: unknown) => {
      const decoded = transfer.decode(serializedResponse);

      // 응답 구조 검증
      if (decoded == null || typeof decoded !== "object" || !("type" in decoded)) {
        logger.warn("워커로부터 잘못된 응답 형식:", decoded);
        return;
      }
      const response = decoded as WorkerResponse;

      if (response.type === "event") {
        this.emit(response.event, response.body);
      } else if (response.type === "log") {
        process.stdout.write(response.body);
      } else if (response.type === "return") {
        const pending = this._pendingRequests.get(response.request.id);
        if (pending) {
          this._pendingRequests.delete(response.request.id);
          pending.resolve(response.body);
        }
      } else {
        // response.type === "error"
        const pending = this._pendingRequests.get(response.request.id);
        if (pending) {
          this._pendingRequests.delete(response.request.id);
          pending.reject(response.body);
        }
      }
    });
  }

  /**
   * 대기 중인 모든 요청을 거부한다.
   */
  private _rejectAllPending(err: Error): void {
    for (const [_id, { method, reject }] of this._pendingRequests) {
      reject(new Error(`${err.message} (method: ${method})`));
    }
    this._pendingRequests.clear();
  }

  /**
   * 워커 메서드를 호출한다.
   */
  call(method: string, params: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const request: WorkerRequest = {
        id: Uuid.generate().toString(),
        method,
        params,
      };

      this._pendingRequests.set(request.id, { method, resolve, reject });

      const serialized = transfer.encode(request);
      this._worker.postMessage(serialized.result, serialized.transferList);
    });
  }

  /**
   * 워커를 종료한다.
   */
  async terminate(): Promise<void> {
    this._isTerminated = true;
    this._rejectAllPending(new Error("워커가 종료되었습니다"));
    await this._worker.terminate();
  }
}

//#endregion

//#region Worker

/**
 * 타입 안전한 Worker 래퍼.
 */
export const Worker = {
  /**
   * 타입 안전한 Worker Proxy를 생성한다.
   *
   * @param filePath - 워커 파일 경로 (file:// URL 또는 절대 경로)
   * @param opt - 워커 옵션
   * @returns Proxy 객체 (메서드 직접 호출, on(), terminate() 지원)
   */
  create<TModule extends WorkerModule>(
    filePath: string,
    opt?: Omit<WorkerRawOptions, "stdout" | "stderr">,
  ): WorkerProxy<TModule> {
    const internal = new WorkerInternal(filePath, opt);

    return new Proxy({} as WorkerProxy<TModule>, {
      get(_target, prop: string) {
        // 예약된 메서드: on, off, terminate
        if (prop === "on") {
          return (event: string, listener: (data: unknown) => void) => {
            internal.on(event, listener);
          };
        }
        if (prop === "off") {
          return (event: string, listener: (data: unknown) => void) => {
            internal.off(event, listener);
          };
        }
        if (prop === "terminate") {
          return () => internal.terminate();
        }

        // 그 외의 경우 워커 메서드로 처리
        return (...args: unknown[]) => internal.call(prop, args);
      },
    });
  },
};

//#endregion
