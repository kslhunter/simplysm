export abstract class CordovaFileSystem {
  /**
   * 연결된 USB 장치 목록을 가져옴
   * @returns 연결된 USB 장치 정보 배열
   */
  static async listFiles(dirPath: string): Promise<string[]> {
    return await new Promise((resolve, reject) => {
      cordova.exec(
        (res) => {
          resolve(res);
        },
        (err) => {
          reject(new Error("CORDOVA: ERROR: " + err));
        },
        "CordovaFileSystem",
        "listFiles",
        [dirPath],
      );
    });
  }
}