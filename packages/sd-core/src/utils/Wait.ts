// tslint:disable-next-line:variable-name
export const Wait = {
  async true(forwarder: () => boolean | PromiseLike<boolean>): Promise<void> {
    while (true) {
      if (await forwarder()) {
        break;
      }
      await this.time(100);
    }
  },

  async false(forwarder: () => boolean | PromiseLike<boolean>): Promise<void> {
    while (true) {
      if (!await forwarder()) {
        break;
      }
      await this.time(100);
    }
  },

  async time(millisec: number = 0): Promise<void> {
    await new Promise<void>(resolve => {
      setTimeout(() => {
        resolve();
      }, millisec);
    });
  }
};
