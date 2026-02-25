/**
 * Asynchronous serial queue
 *
 * Functions added to the queue are executed sequentially.
 * The next task starts only after one task completes.
 * Subsequent tasks continue to execute even if an error occurs.
 *
 * @example
 * const queue = new SerialQueue();
 * queue.run(async () => { await fetch("/api/1"); });
 * queue.run(async () => { await fetch("/api/2"); }); // executed after 1 completes
 * queue.run(async () => { await fetch("/api/3"); }); // executed after 2 completes
 *
 * @example
 * // Error handling
 * queue.on("error", (err) => console.error(err));
 */
import { SdError } from "../errors/sd-error";
import { EventEmitter } from "./event-emitter";
import consola from "consola";
import { waitTime } from "../utils/wait";

interface SerialQueueEvents {
  error: SdError;
}

export class SerialQueue extends EventEmitter<SerialQueueEvents> {
  private static readonly _logger = consola.withTag("SerialQueue");

  private readonly _queue: (() => void | Promise<void>)[] = [];
  private _isQueueRunning = false;

  /**
   * @param _gap Gap between each task (ms)
   */
  constructor(private readonly _gap: number = 0) {
    super();
  }

  /**
   * Clear pending queue (currently executing task will complete)
   */
  override dispose(): void {
    this._queue.length = 0;
    super.dispose();
  }

  /**
   * Supports using statement
   */
  override [Symbol.dispose](): void {
    this.dispose();
  }

  /**
   * Add a function to the queue and execute it
   */
  run(fn: () => void | Promise<void>): void {
    this._queue.push(fn);
    void this._process();
  }

  private async _process(): Promise<void> {
    if (this._isQueueRunning) return;
    this._isQueueRunning = true;

    try {
      while (this._queue.length > 0) {
        const fn = this._queue.shift();
        if (!fn) break;

        try {
          await fn();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          const sdError = new SdError(error, "Error occurred while executing queue task");

          // If there are listeners, emit as event; otherwise log
          if (this.listenerCount("error") > 0) {
            this.emit("error", sdError);
          } else {
            SerialQueue._logger.error(sdError);
          }
        }

        if (this._gap > 0 && this._queue.length > 0) {
          await waitTime(this._gap);
        }
      }
    } finally {
      this._isQueueRunning = false;
    }
  }
}
