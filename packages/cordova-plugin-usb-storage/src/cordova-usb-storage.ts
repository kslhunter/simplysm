export abstract class CordovaUsbStorage {
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
