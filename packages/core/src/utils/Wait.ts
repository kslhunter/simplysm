export class Wait {
    static async true(forwarder: () => boolean | PromiseLike<boolean>): Promise<void> {
        while (true) {
            if (await forwarder()) {
                break;
            }
            await this.time(100);
        }
    }

    static async false(forwarder: () => boolean | PromiseLike<boolean>): Promise<void> {
        while (true) {
            if (!await forwarder()) {
                break;
            }
            await this.time(100);
        }
    }

    static async time(millisec: number = 0): Promise<void> {
        await new Promise<void>(resolve => {
            setTimeout(() => {
                resolve();
            }, millisec);
        });
    }
}