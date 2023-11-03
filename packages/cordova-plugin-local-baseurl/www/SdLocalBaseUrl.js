module.exports = {
  async setUrl(url) {
    await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      cordova.exec(() => {
        resolve();
      }, (err) => {
        reject(err);
      }, 'sdLocalBaseUrl', 'setUrl', [url]);
    });
  }
};