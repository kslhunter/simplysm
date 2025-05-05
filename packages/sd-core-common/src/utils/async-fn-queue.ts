import {Wait} from "./wait";

export class AsyncFnQueue {
  private readonly _queue: (() => void | Promise<void>)[] = [];
  private _isQueueRunning = false;

  constructor(private readonly _gap?: number) {
  }

  run(fn: () => void | Promise<void>): void {
    this._queue.push(fn);
    if (this._isQueueRunning) return;

    void (async () => {
      this._isQueueRunning = true;
      while (true) {
        const runningFn = this._queue.shift();
        if (!runningFn) break;
        await runningFn();
        if (this._gap !== undefined && this._gap > 0) {
          await Wait.time(this._gap);
        }
      }
      this._isQueueRunning = false;
    })();
  }

  runLast(fn: () => void | Promise<void>): void {
    this._queue.push(fn);
    if (this._isQueueRunning) return;

    void (async () => {
      this._isQueueRunning = true;
      while (true) {
        const runningFn = this._queue.last();
        this._queue.clear();

        if (!runningFn) break;
        await runningFn();
        if (this._gap !== undefined && this._gap > 0) {
          await Wait.time(this._gap);
        }
      }
      this._isQueueRunning = false;
    })();
  }
}
