export abstract class SdLocalBaseUrl {
  static async setUrl(url: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      cordova.exec(() => {
        resolve();
      }, () => {
        reject(new Error("CORDOVA: ERROR"));
      }, 'sdLocalBaseUrl', 'setUrl', [url]);
    });
  }
}