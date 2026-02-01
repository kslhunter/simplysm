/**
 * 비동기 함수 직렬 큐
 *
 * 큐에 추가된 함수들을 순서대로 실행합니다.
 * 한 작업이 완료되어야 다음 작업이 시작됩니다.
 * 에러가 발생해도 후속 작업은 계속 실행됩니다.
 *
 * @example
 * const queue = new SerialQueue();
 * queue.run(async () => { await fetch("/api/1"); });
 * queue.run(async () => { await fetch("/api/2"); }); // 1번 완료 후 실행
 * queue.run(async () => { await fetch("/api/3"); }); // 2번 완료 후 실행
 *
 * @example
 * // 에러 처리
 * queue.on("error", (err) => console.error(err));
 */
import { SdError } from "../errors/sd-error";
import { EventEmitter } from "./event-emitter";
interface SerialQueueEvents {
    error: SdError;
}
export declare class SerialQueue extends EventEmitter<SerialQueueEvents> {
    private readonly _gap;
    private static readonly _logger;
    private readonly _queue;
    private _isQueueRunning;
    /**
     * @param _gap 각 작업 사이의 간격 (ms)
     */
    constructor(_gap?: number);
    /**
     * 대기 중인 큐 비우기 (현재 실행 중인 작업은 완료됨)
     */
    dispose(): void;
    /**
     * using 문 지원
     */
    [Symbol.dispose](): void;
    /**
     * 함수를 큐에 추가하고 실행
     */
    run(fn: () => void | Promise<void>): void;
    private _processAsync;
}
export {};
//# sourceMappingURL=serial-queue.d.ts.map