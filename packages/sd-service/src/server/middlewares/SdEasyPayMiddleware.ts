import * as http from "http";
// import * as url from "url";
import * as querystring from "querystring";
import {JsonConvert} from "@simplysm/sd-core";
import * as edge from "edge-js";

export function SdEasyPayMiddleware(req: http.IncomingMessage, res: http.ServerResponse, next: (err?: any) => void): void {
  /*const urlObj = url.parse(req.url!, true, false);
  const urlPath = decodeURI(urlObj.pathname!.slice(1));

  if (req.method !== "POST" && urlPath !== "_easy-pay") {
    next();
    return;
  }*/

  let body = "";
  req.on("readable", () => {
    body += req.read();
  });
  req.on("end", () => {
    try {
      const params = querystring.parse(body);
      const aaa = edge.func({
        source: () => {/*
      public class Startup
      {
        public async Task<object> Invoke(object input)
        {
          EP_CLI_COMLib.KICCClass Easypay = new EP_CLI_COMLib.KICCClass();
          return "aaa";
        }
      }
      */
        },
        references: [require("../../../assets/Interop.EP_CLI64_COMLib.dll")] // tslint:disable-line:no-var-requires no-require-imports
      });
      console.log(aaa);

      res.end(JsonConvert.stringify(params, {space: 2}));
    }
    catch (err) {
      next(err);
    }
  });
}