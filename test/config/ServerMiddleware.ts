import {SdServiceServer} from "@simplysm/sd-service-server";
import * as http from "http";
import {NextFunction} from "connect";
import * as path from "path";
import {TestService} from "./TestService";
import {Logger, LoggerSeverity} from "@simplysm/sd-core-node";

Logger.setConfig({
  file: {
    level: LoggerSeverity.log,
    outDir: path.resolve(process.cwd(), "logs")
  }
});

export class ServerMiddleware {
  private static _server?: SdServiceServer;

  public static async middlewareAsync(req: http.IncomingMessage, res: http.ServerResponse, next: NextFunction): Promise<void> {
    try {
      if (req.url === "/startServer") {
        if (ServerMiddleware._server) {
          throw new Error("2개 이상의 서버를 동시에 테스트할 수 없습니다.");
        }

        const body = await new Promise<string>((resolve, reject) => {
          let data = "";
          req.on("readable", () => {
            try {
              data += req.read()?.toString() ?? "";
            }
            catch (err) {
              reject(err);
            }
          });
          req.on("error", async (err) => {
            reject(err);
          });
          req.on("end", async () => {
            resolve(data);
          });
        });

        const param = JSON.parse(body);
        ServerMiddleware._server = new SdServiceServer({
          port: param.port,
          rootPath: path.resolve(__dirname),
          services: [
            TestService
          ]
        });
        await ServerMiddleware._server.listenAsync();
        res.writeHead(200);
        res.end();
      }
      else if (req.url === "/stopServer") {
        await ServerMiddleware._server!.closeAsync();
        ServerMiddleware._server = undefined;
        res.writeHead(200);
        res.end();
      }
      else {
        next();
      }
    }
    catch (err) {
      next(err);
    }
  }
}
