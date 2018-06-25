export class Wait {
  public static async true(forwarder: () => boolean | Promise<boolean>, milliseconds: number = 100): Promise<void> {
    while (true) {
      if (await forwarder()) {
        break;
      }
      await this.time(milliseconds);
    }
  }

  public static async time(millisecond: number = 0): Promise<void> {
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