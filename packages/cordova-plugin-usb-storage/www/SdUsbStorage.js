module.exports = {
  async getDevices() {
    return await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      cordova.exec((res) => {
        resolve(res);
      }, (err) => {
        reject(new Error("CORDOVA: ERROR: " + err));
      }, 'SdUsbStorage', 'getDevices');
    });
  },
  async requestPermission(filter) {
    return await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      cordova.exec(() => {
        resolve();
      }, (err) => {
        reject(new Error("CORDOVA: ERROR: " + err));
      }, 'SdUsbStorage', 'requestPermission', [filter.vendorId, filter.productId]);
    });
  },
  async readdir(filter, dirPath) {
    return await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      cordova.exec((res) => {
        resolve(res);
      }, (err) => {
        reject(new Error("CORDOVA: ERROR: " + err));
      }, 'SdUsbStorage', 'readdir', [filter.vendorId, filter.productId, dirPath]);
    });
  },
  async read(filter, filePath) {
    return await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      cordova.exec((res) => {
        resolve(res);
      }, (err) => {
        reject(new Error("CORDOVA: ERROR: " + err));
      }, 'SdUsbStorage', 'read', [filter.vendorId, filter.productId, filePath]);
    });
  }
};