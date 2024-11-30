/**
 * USB 저장장치 관리 클래스
 *
 * USB 저장장치의 연결, 권한 관리 등의 기능을 제공하는 클래스입니다.
 *
 * @example
 * ```ts
 * // USB 장치 목록 조회
 * const devices = await SdUsbStorage.getDevices();
 *
 * // 특정 USB 장치에 대한 권한 요청
 * const hasPermission = await SdUsbStorage.requestPermission({
 *   vendorId: 0x0483,
 *   productId: 0x5740
 * });
 * ```
 *
 * @remarks
 * - Android 플랫폼에서만 동작합니다.
 * - USB 호스트 기능을 지원하는 기기에서만 사용 가능합니다.
 * - USB 저장장치의 연결 상태 확인, 권한 요청 및 확인 기능을 제공합니다.
 */
export abstract class SdUsbStorage {
  /**
   * USB 장치 목록을 조회합니다.
   *
   * @returns 연결된 USB 장치들의 정보를 담은 배열을 반환합니다.
   * 각 장치 정보는 deviceName, manufacturerName, productName, vendorId, productId를 포함합니다.
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
        "SdUsbStorage",
        "getDevices",
      );
    });
  }

  /**
   * 특정 USB 장치에 대한 접근 권한을 요청합니다.
   *
   * @param filter 권한을 요청할 USB 장치의 vendorId와 productId
   * @returns 권한 획득 성공 여부를 반환합니다.
   */
  static async requestPermission(filter: { vendorId: number; productId: number }): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      cordova.exec(
        (res) => {
          resolve(res);
        },
        (err) => {
          reject(new Error("CORDOVA: ERROR: " + err));
        },
        "SdUsbStorage",
        "requestPermission",
        [filter.vendorId, filter.productId],
      );
    });
  }

  /**
   * 특정 USB 장치에 대한 접근 권한이 있는지 확인합니다.
   *
   * @param filter 권한을 확인할 USB 장치의 vendorId와 productId
   * @returns 권한 보유 여부를 반환합니다.
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
        "SdUsbStorage",
        "hasPermission",
        [filter.vendorId, filter.productId],
      );
    });
  }

  /**
   * USB 저장장치의 특정 디렉토리 내용을 읽어옵니다.
   *
   * @param filter 대상 USB 장치의 vendorId와 productId
   * @param dirPath 읽어올 디렉토리 경로
   * @returns 디렉토리 내 파일 및 폴더 목록을 반환합니다.
   */
  static async readdir(filter: { vendorId: number; productId: number }, dirPath: string): Promise<string[]> {
    return await new Promise((resolve, reject) => {
      cordova.exec(
        (res) => {
          resolve(res);
        },
        (err) => {
          reject(new Error("CORDOVA: ERROR: " + err));
        },
        "SdUsbStorage",
        "readdir",
        [filter.vendorId, filter.productId, dirPath],
      );
    });
  }

  /**
   * USB 저장장치의 특정 파일 내용을 읽어옵니다.
   *
   * @param filter 대상 USB 장치의 vendorId와 productId
   * @param filePath 읽어올 파일 경로
   * @returns 파일의 내용을 ArrayBuffer 형태로 반환합니다. 실패 시 undefined를 반환합니다.
   */
  static async read(
    filter: { vendorId: number; productId: number },
    filePath: string,
  ): Promise<ArrayBuffer | undefined> {
    return await new Promise((resolve, reject) => {
      cordova.exec(
        (res) => {
          resolve(res);
        },
        (err) => {
          reject(new Error("CORDOVA: ERROR: " + err));
        },
        "SdUsbStorage",
        "read",
        [filter.vendorId, filter.productId, filePath],
      );
    });
  }
}
