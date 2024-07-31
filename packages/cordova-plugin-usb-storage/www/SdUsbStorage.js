module.exports = {
  async getDevices() {
    return await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      cordova.exec((url) => {
        resolve(url);
      }, (err) => {
        reject(new Error("CORDOVA: ERROR: " + err));
      }, 'SdUsbStorage', 'getDevices');
    });
  },
  async requestPermission(filter) {
    return await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      cordova.exec((url) => {
        resolve(url);
      }, (err) => {
        reject(new Error("CORDOVA: ERROR: " + err));
      }, 'SdUsbStorage', 'requestPermission', [filter.vendorId, filter.productId]);
    });
  },
  async readdir(filter, filePath) {
    return await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      cordova.exec((url) => {
        resolve(url);
      }, (err) => {
        reject(new Error("CORDOVA: ERROR: " + err));
      }, 'SdUsbStorage', 'readdir', [filter.vendorId, filter.productId, filePath]);
    });
  }
};