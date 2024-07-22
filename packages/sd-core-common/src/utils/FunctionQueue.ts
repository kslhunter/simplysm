import EventEmitter from "events";
import {Wait} from "./Wait";

export class FunctionQueue extends EventEmitter {
  #queue: (() => void | Promise<void>)[] = [];
  #isRunning = false;

  #gap: number;

  override on(event: "start", listener: () => void): this;
  override on(event: "end", listener: () => void): this;
  override on(event: "error", listener: (err: Error) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  constructor(gap: number = 0) {
    super();
    this.#gap = gap;
  }

  run(fn: () => void | Promise<void>): void {
    this.#queue.push(fn);
    if (this.#isRunning) return;

    void (async () => {
      this.#isRunning = true;
      while (true) {
        const runningFn = this.#queue.shift();
        if (!runningFn) break;
        this.emit("start");
        try {
          await runningFn();
        }
        catch (err) {
          this.emit("error", err);
        }
        this.emit("end");
        if (this.#gap > 0) {
          await Wait.time(this.#gap);
        }
      }
      this.#isRunning = false;
    })();
  }

  runLast(fn: () => void | Promise<void>): void {
    this.#queue.push(fn);
    if (this.#isRunning) return;

    void (async () => {
      this.#isRunning = true;
      while (true) {
        const runningFn = this.#queue.last();
        this.#queue.clear();

        if (!runningFn) break;
        this.emit("start");
        try {
          await runningFn();
        }
        catch (err) {
          this.emit("error", err);
        }
        this.emit("end");
        if (this.#gap > 0) {
          await Wait.time(this.#gap);
        }
      }
      this.#isRunning = false;
    })();
  }
}
