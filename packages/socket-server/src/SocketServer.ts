import {SocketServiceBase} from "./SocketServiceBase";
import {JsonConvert, Logger, Type} from "@simplism/core";
import * as http from "http";
import * as WebSocket from "ws";
import {ISocketRequest, ISocketResponse} from "@simplism/socket-common";
import * as url from "url";
import * as fs from "fs";
import * as path from "path";
import * as mime from "mime";

export class SocketServer {
  private readonly _logger = new Logger("@simplism/socket-server", "SocketServer");
  private _app?: http.Server;
  private _server?: WebSocket.Server;

  public constructor(private readonly _services: Type<SocketServiceBase>[]) {
  }

  public async startAsync(port?: number, host?: string): Promise<void> {
    await new Promise<void>(resolve => {
      if (this._app && this._app.listening) {
        return;
      }

      // STATIC(ANGULAR) 서버
      this._app = http.createServer((req, res) => {
        this._webRequestHandler(req, res);
      });

      // SOCKET 서버
      this._server = new WebSocket.Server({server: this._app});

      this._server.on("connection", (ws, req) => {
        this._socketConnectionHandler(ws, req);
      });

      // 서버 시작
      this._app.listen(port || 80, host || "localhost", () => {
        this._logger.info(`소켓서버 시작: ${host || "localhost"}:${port || 80}`);
        resolve();
      });
    });
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>(resolve => {
      this._app!.close(() => {
        this._logger.info("소켓서버 종료");
        resolve();
      });
    });
  }

  private _socketConnectionHandler(ws: WebSocket, req: http.IncomingMessage): void {
    this._logger.log("연결: " + req.connection.remoteAddress);

    ws.on("message", async (message: string) => {
      this._logger.log("요청 받음: " + req.headers.origin + ": " + message);

      // Request 파싱
      const request: ISocketRequest = JsonConvert.parse(message);

      // 요청처리
      let response: ISocketResponse;
      try {
        response = await this._socketRequestHandler(request);
      }
      catch (err) {
        this._logger.error(err);
        response = {
          requestId: request.id,
          type: "error",
          body: err.message
        };
      }

      // 결과 전송
      const responseJson = JsonConvert.stringify(response);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(responseJson);
      }
    });
  }

  private async _socketRequestHandler(request: ISocketRequest): Promise<ISocketResponse> {
    // COMMAND 분할
    const cmdSplit = request.command.split(".");
    const serviceName = cmdSplit[0];
    const methodName = cmdSplit[1];

    // 서비스 가져오기
    const serviceClass = this._services.single(item => item.name === serviceName);
    if (!serviceClass) {
      throw new Error(`서비스[${serviceName}]를 찾을 수 없습니다.`);
    }

    const service = new serviceClass();
    service.request = request;

    // 메소드 가져오기
    const method = service[methodName];
    if (!method) {
      throw new Error(`메소드[${serviceName}.${methodName}]를 찾을 수 없습니다.`);
    }

    // 실행
    const result = await method.apply(service, request.params);

    // 반환
    return {
      requestId: request.id,
      type: "response",
      body: result
    };
  }


  private _webRequestHandler(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (req.method !== "GET") {
      this._responseErrorHtml(res, 405, `요청이 잘못되었습니다.${process.env.NODE_ENV === "production" ? "" : `(${req.method!.toUpperCase()})`}`);
    }

    const urlObj = url.parse(req.url!, true, false);
    const urlPath = decodeURI(urlObj.pathname!.slice(1));

    let filePath: string;

    // 'url'이 파일에 직접 닿지 않는 경우, index.html 파일 사용
    if (!(urlPath.split("/").last() || "").includes(".")) {
      filePath = path.resolve("www", urlPath, "index.html");
    }
    else {
      filePath = path.resolve("www", urlPath);
    }

    // 파일이 없으면 404오류 발생
    if (!fs.existsSync(filePath)) {
      this._responseErrorHtml(res, 404, `파일을 찾을 수 없습니다.${process.env.NODE_ENV}` === "production" ? "" : ` [${filePath}]`);
      return;
    }

    const fileStream = fs.createReadStream(filePath);
    const indexFileSize = fs.lstatSync(filePath).size;

    res.setHeader("Content-Length", indexFileSize);
    res.setHeader("Content-Type", mime.getType(filePath)!);
    res.writeHead(200);
    fileStream.pipe(res);
  }

  private _responseErrorHtml(res: http.ServerResponse, code: number, message: string): void {
    res.writeHead(code);
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta charset="UTF-8">
    <title>${code}: ${message}</title>
</head>
<body>${code}: ${message}</body>
</html>`);
  }
}