export class Wait {
  public static async true(forwarder: () => boolean | Promise<boolean>, milliseconds?: number, timeout?: number): Promise<void> {
    let currMs = 0;
    while (true) {
      if (await forwarder()) {
        break;
      }
      await this.time(milliseconds || 100);

      if (timeout) {
        currMs += milliseconds || 100;
        if (currMs >= timeout) {
          throw new Error("Timeout");
        }
      }
    }
  }

  public static async time(millisecond: number): Promise<void> {
    await new Promise<void>(resolve => {
      setTimeout(
        () => {
          resolve();
        },
        millisecond
      );
    });
  }
}