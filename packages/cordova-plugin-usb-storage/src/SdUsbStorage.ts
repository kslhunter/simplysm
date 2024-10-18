export abstract class SdUsbStorage {
  static async getDevices() {
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
  static async requestPermission(filter) {
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
  static async hasPermission(filter) {
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
  static async readdir(filter, dirPath) {
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
  static async read(filter, filePath) {
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
