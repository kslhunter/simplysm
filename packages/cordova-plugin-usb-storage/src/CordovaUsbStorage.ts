/**
 * USB 저장장치와 상호작용하기 위한 Cordova 플러그인 클래스
 */
export abstract class CordovaUsbStorage {
  /**
   * 연결된 USB 장치 목록을 가져옴
   * @returns 연결된 USB 장치 정보 배열
   */
  static async getDevices(): Promise<
    {
      deviceName: string;
      manufacturerName: string;
      productName: string;
      vendorId: number;
      productId: number;
    }[]
  > {
    return await new Promise((resolve, reject) => {
      cordova.exec(
        (res) => {
          resolve(res);
        },
        (err) => {
          reject(new Error("CORDOVA: ERROR: " + err));
        },
        "CordovaUsbStorage",
        "getDevices",
      );
    });
  }

  /**
   * USB 장치 접근 권한을 요청
   * @param filter 권한을 요청할 USB 장치의 vendorId와 productId
   * @returns 권한 승인 여부
   */
  static async requestPermission(filter: {
    vendorId: number;
    productId: number;
  }): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      cordova.exec(
        (res) => {
          resolve(res);
        },
        (err) => {
          reject(new Error("CORDOVA: ERROR: " + err));
        },
        "CordovaUsbStorage",
        "requestPermission",
        [filter.vendorId, filter.productId],
      );
    });
  }

  /**
   * USB 장치 접근 권한이 있는지 확인
   * @param filter 권한을 확인할 USB 장치의 vendorId와 productId
   * @returns 권한 보유 여부
   */
  static async hasPermission(filter: { vendorId: number; productId: number }): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      cordova.exec(
        (res) => {
          resolve(res);
        },
        (err) => {
          reject(new Error("CORDOVA: ERROR: " + err));
        },
        "CordovaUsbStorage",
        "hasPermission",
        [filter.vendorId, filter.productId],
      );
    });
  }

  /**
   * USB 저장장치의 디렉토리 내용을 읽어옴
   * @param filter 대상 USB 장치의 vendorId와 productId
   * @param dirPath 읽어올 디렉토리 경로
   * @returns 디렉토리 내 파일/폴더 이름 배열
   */
  static async readdir(
    filter: { vendorId: number; productId: number },
    dirPath: string,
  ): Promise<string[]> {
    return await new Promise((resolve, reject) => {
      cordova.exec(
        (res) => {
          resolve(res);
        },
        (err) => {
          reject(new Error("CORDOVA: ERROR: " + err));
        },
        "CordovaUsbStorage",
        "readdir",
        [filter.vendorId, filter.productId, dirPath],
      );
    });
  }

  /**
   * USB 저장장치의 파일을 읽어옴
   * @param filter 대상 USB 장치의 vendorId와 productId
   * @param filePath 읽어올 파일 경로
   * @returns 파일 데이터를 담은 Buffer 또는 undefined
   */
  static async read(
    filter: { vendorId: number; productId: number },
    filePath: string,
  ): Promise<Buffer | undefined> {
    return await new Promise<Buffer | undefined>((resolve, reject) => {
      cordova.exec(
        (res: ArrayBuffer | undefined) => {
          resolve(res ? Buffer.from(res) : undefined);
        },
        (err) => {
          reject(new Error("CORDOVA: ERROR: " + err));
        },
        "CordovaUsbStorage",
        "read",
        [filter.vendorId, filter.productId, filePath],
      );
    });
  }
}
