import { Wait } from "./Wait";
import EventEmitter from "events";

export class AsyncFnQueue extends EventEmitter {
  readonly #queue: (() => void | Promise<void>)[] = [];
  #isQueueRunning = false;

  #timer: ReturnType<typeof setTimeout> | undefined;

  override on(event: "error", listener: (err: Error) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  constructor(private readonly _gap?: number) {
    super();
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
    this.#queue.length = 0;
    this.#queue.push(fn);

    if (this.#isQueueRunning) return;

    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(async () => {
      this.#timer = undefined;
      try {
        await this.#runLastAsync();
      } catch (err) {
        this.emit("error", err instanceof Error ? err : new Error(String(err)));
      }
    }, this._gap ?? 0);
  }

  async #runLastAsync() {
    if (this.#isQueueRunning) return;
    this.#isQueueRunning = true;

    try {
      while (true) {
        const runningFn = this.#queue.at(-1);
        this.#queue.length = 0;
        if (!runningFn) break;

        await runningFn();
      }
    } catch (err) {
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
    } finally {
      this.#isQueueRunning = false;

      if (this.#queue.length > 0) {
        await this.#runLastAsync();
      }
    }
  }
}
