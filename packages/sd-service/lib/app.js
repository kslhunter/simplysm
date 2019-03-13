const {SdWebSocketServer} = require("@simplysm/sd-service");
const {Logger} = require("@simplysm/sd-common");
const path = require("path");

new SdWebSocketServer()
  .listenAsync(path.resolve(process.cwd(), "www"), Number(process.argv[2]))
  .then(() => {
    new Logger("@simplysm/sd-service").log(`서버가 시작되었습니다. [STATIC: ${path.resolve(process.cwd(), "www")}] [PORT: ${process.argv[2]}]`);
  })
  .catch(err => {
    new Logger("@simplysm/sd-service").error(err);
    process.exit(1);
  });