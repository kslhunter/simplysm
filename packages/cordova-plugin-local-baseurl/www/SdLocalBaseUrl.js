// declare global (window에 바로 SdLocalBaseUrl 사용)
module.exports = {
  // TODO:Ionic.WebView로 안될려나...
  setUrl: async (url) => {
    await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      cordova.exec(() => {
        resolve();
      }, (err) => {
        reject(new Error("CORDOVA: ERROR: " + err));
      }, 'SdLocalBaseUrl', 'setUrl', [url]);
    });
  },
  getUrl: async () => {
    return await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      cordova.exec((url) => {
        resolve(url);
      }, (err) => {
        reject(new Error("CORDOVA: ERROR: " + err));
      }, 'SdLocalBaseUrl', 'getUrl');
    });
  }
};