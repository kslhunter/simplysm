import { TimeoutError } from "../errors/TimeoutError";

export class Wait {
  static async until(
    forwarder: () => boolean | Promise<boolean>,
    milliseconds?: number,
    timeout?: number,
  ): Promise<void> {
    let currMs = 0;
    while (!(await forwarder())) {
      await Wait.time(milliseconds ?? 100);

      if (timeout !== undefined) {
        currMs += milliseconds ?? 100;
        if (currMs >= timeout) {
          throw new TimeoutError();
        }
      }
    }
  }

  static async time(millisecond: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, millisecond);
    });
  }
}
