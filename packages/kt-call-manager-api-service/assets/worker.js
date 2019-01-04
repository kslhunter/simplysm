const winax = require("winax");

setInterval(() => {
}, 1000);

const ax = new winax.Object("KTPCBiz.KTPCBizX");

process.on("message", msg => {
  if (msg[0] === "login") {
    const isProduction = msg[1];
    const apiKey = msg[2];
    const loginId = msg[3];
    const password = msg[4];

    const loginResult = ax.Login(isProduction ? 1 : 0, apiKey, loginId, password);
    process.send({
      type: "return",
      name: "login",
      code: loginResult
    });
    console.log(ax.EventLogin);

    setTimeout(() => {
      setTimeout(() => {
        process.send({
          type: "event",
          name: "login",
          code: 200
        });
      }, 1000);
    }, 1000);
  }
  else {
    process.send({
      type: "error",
      name: msg[0],
      code: -1
    });
  }
});
