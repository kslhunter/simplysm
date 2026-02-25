/**
 * Asynchronous debounce queue
 *
 * When called multiple times within a short time, only the last request is executed
 * and previous requests are ignored. Useful for input field auto-complete,
 * batching consecutive state changes, and more.
 *
 * @remarks
 * Requests added during execution are processed immediately after the current execution
 * completes without debounce delay. This is an intentional design to ensure that
 * requests arriving before execution completes are not missed.
 *
 * @example
 * const queue = new DebounceQueue(300); // 300ms delay
 * queue.run(() => console.log("1")); // ignored
 * queue.run(() => console.log("2")); // ignored
 * queue.run(() => console.log("3")); // executed after 300ms
 *
 * @example
 * // Error handling
 * queue.on("error", (err) => console.error(err));
 */
import { SdError } from "../errors/sd-error";
import { EventEmitter } from "./event-emitter";
import consola from "consola";

interface DebounceQueueEvents {
  error: SdError;
}

export class DebounceQueue extends EventEmitter<DebounceQueueEvents> {
  private static readonly _logger = consola.withTag("DebounceQueue");

  private _pendingFn: (() => void | Promise<void>) | undefined;
  private _isRunning = false;
  private _isDisposed = false;
  private _timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * @param _delay Debounce delay time (milliseconds). If omitted, executes immediately (next event loop)
   */
  constructor(private readonly _delay?: number) {
    super();
  }

  /**
   * Clean up pending tasks and timers
   */
  override dispose(): void {
    this._isDisposed = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
    this._pendingFn = undefined;
    super.dispose();
  }

  /**
   * Supports using statement
   */
  override [Symbol.dispose](): void {
    this.dispose();
  }

  /**
   * Add a function to the queue
   * If there was a previously added function, it will be replaced
   */
  run(fn: () => void | Promise<void>): void {
    if (this._isDisposed) return;

    this._pendingFn = fn;

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }

    if (!this._isRunning) {
      this._timer = setTimeout(() => {
        void this._processLast();
      }, this._delay);
    }
  }

  private async _processLast(): Promise<void> {
    if (this._isDisposed || this._isRunning || !this._pendingFn) return;

    this._isRunning = true;
    this._timer = undefined;

    try {
      // If a new request comes in during execution, process it immediately without debounce delay
      // This is an intentional design to process requests that arrived before execution completes immediately after execution
      while (this._pendingFn) {
        const currentFn = this._pendingFn;
        this._pendingFn = undefined;

        try {
          await currentFn();
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          const sdError = new SdError(error, "Error occurred while executing task");

          // If there are listeners, emit as event; otherwise log
          if (this.listenerCount("error") > 0) {
            this.emit("error", sdError);
          } else {
            DebounceQueue._logger.error(sdError);
          }
        }
      }
    } finally {
      this._isRunning = false;
    }
  }
}
