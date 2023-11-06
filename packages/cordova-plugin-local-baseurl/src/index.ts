// declare global (window에 바로 SdLocalBaseUrl 사용)

export default abstract class Index {
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