const {SdWebSocketServer} = require("@simplysm/ws-server");
const {Logger} = require("@simplysm/common");
const path = require("path");

new SdWebSocketServer()
  .listenAsync(path.resolve(process.cwd(), "www"), Number(process.argv[2]))
  .then(() => {
    new Logger("@simplysm/ws-server").log(`서버가 시작되었습니다. [STATIC: ${path.resolve(process.cwd(), "www")}] [PORT: ${process.argv[2]}]`);
  })
  .catch(err => {
    new Logger("@simplysm/ws-server").error(err);
    process.exit(1);
  });