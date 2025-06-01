import {Wait} from "./wait";

export class AsyncFnQueue {
  readonly #queue: (() => void | Promise<void>)[] = [];
  #isQueueRunning = false;

  constructor(private readonly _gap?: number) {
  }

  run(fn: () => void | Promise<void>): void {
    this.#queue.push(fn);
    if (this.#isQueueRunning) return;

    void (async () => {
      this.#isQueueRunning = true;
      while (true) {
        const runningFn = this.#queue.shift();
        if (!runningFn) break;
        await runningFn();
        if (this._gap !== undefined && this._gap > 0) {
          await Wait.time(this._gap);
        }
      }
      this.#isQueueRunning = false;
    })();
  }

  runLast(fn: () => void | Promise<void>): void {
    this.#queue.push(fn);
    if (this.#isQueueRunning) return;

    void (async () => {
      this.#isQueueRunning = true;
      while (true) {
        const runningFn = this.#queue.last();
        this.#queue.clear();

        if (!runningFn) break;
        await runningFn();
        if (this._gap !== undefined && this._gap > 0) {
          await Wait.time(this._gap);
        }
      }
      this.#isQueueRunning = false;
    })();
  }
}
