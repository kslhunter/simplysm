import {Exception, JsonConvert, Logger, Type, Uuid} from "@simplism/core";
import {IWebSocketRequest, IWebSocketResponse} from "@simplism/websocket-client";
import * as http from "http";
import * as WebSocket from "ws";
import * as url from "url";
import * as mime from "mime";
import {FileResult} from "./FileResult";
import * as path from "path";
import * as fs from "fs";
import {WebSocketServiceBase} from "./WebSocketServiceBase";

export interface IWebSocketServerOption {
  services: Type<WebSocketServiceBase>[];
  clients?: string[];
}

export interface IWebSocketEvent<I, R> {
  info: I;
  data: R;
}

export interface IWebSocketEventListener {
  ws: WebSocket;
  eventKey: string;
  info?: any;
}

export class WebSocketServer {
  private readonly _logger = new Logger("@simplism/socket", "WebSocketServer");
  private _app?: http.Server;
  private _server?: WebSocket.Server;
  private readonly _preparedFileResults = new Map<string, FileResult>();
  private readonly _listeners: IWebSocketEventListener[] = [];

  public constructor(private readonly _option: IWebSocketServerOption) {
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
        this._logger.info(`started`);
        resolve();
      });
    });
  }

  public async emit<T extends IWebSocketEvent<any, any>>(eventType: Type<T>, listenerSelector: (info: T["info"]) => boolean, sender: () => (T["data"] | Promise<T["data"]>)): Promise<void> {
    const items = this._listeners
      .filter(item => (item.eventKey === eventType.name || item.eventKey.startsWith(eventType.name + ".")) && listenerSelector(item.info));

    if (items.length > 0) {
      const data = await sender();
      for (const item of items) {
        if (item.ws.readyState === WebSocket.OPEN) {
          const response: IWebSocketResponse = {
            requestId: item.eventKey,
            type: "response",
            body: data
          };
          item.ws.send(JsonConvert.stringify(response));
        }
        else {
          this._listeners.remove(item);
        }
      }
    }
  }

  private _webRequestHandler(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (req.method !== "GET") {
      this._responseErrorHtml(res, 405, `요청이 잘못되었습니다.${process.env.NODE_ENV === "production" ? "" : `(${req.method!.toUpperCase()})`}`);
    }

    const urlObj = url.parse(req.url!, true, false);
    const urlPath = decodeURI(urlObj.pathname!.slice(1));

    // 클라이언트 설정없이 요청했다면, 첫번째 클라이언트로 REDIRECT
    if (!urlPath && this._option.clients && this._option.clients[0]) {
      res.writeHead(302, {
        Location: this._option.clients[0]
      });
      res.end();
    }
    // 파일 다운로드
    else if (urlPath.startsWith("__download__")) {
      const token = urlPath.split("/")[1];
      const fileResult = this._preparedFileResults.get(token);
      if (!fileResult) {
        this._responseErrorHtml(res, 403, "다운로드할 파일을 찾을 수 없습니다.");
        return;
      }

      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      res.setHeader("Content-Disposition", `attachment; filename=${encodeURI(fileResult.name)}`);
      res.setHeader("Content-Length", fileResult.size.toString());
      res.setHeader("Content-Type", mime.getType(fileResult.name)!);

      res.writeHead(200);
      fileResult.stream.pipe(res);
    }
    else if (this._option.clients) {
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
    else {
      this._responseErrorHtml(res, 400, "요청이 잘못되었습니다.");
    }
  }

  private _socketConnectionHandler(ws: WebSocket, req: http.IncomingMessage): void {
    this._logger.log("connected from " + req.connection.remoteAddress);

    ws.on("message", async (message: string) => {
      this._logger.log("message from " + req.headers.origin + ": " + message);

      // Request 파싱
      const request: IWebSocketRequest = JsonConvert.parse(message);

      // 요청처리
      let response: IWebSocketResponse;
      try {
        // 이벤트 리스너 등록 명령 처리
        if (request.command === "__addListener__") {
          const eventKey = request.params[0];
          const info = request.params[1];

          this._listeners.push({
            ws,
            eventKey,
            info
          });

          response = {
            requestId: request.id,
            type: "response"
          };
        }
        else if (request.command === "__removeListener__") {
          const eventKey = request.params[0];
          const listener = this._listeners.single(item => item.ws === ws && item.eventKey === eventKey);
          if (listener) this._listeners.remove(listener);
          response = {
            requestId: request.id,
            type: "response"
          };
        }
        else {
          response = await this._socketRequestHandler(request);
        }
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
      ws.send(responseJson);
    });
  }

  private async _socketRequestHandler(request: IWebSocketRequest): Promise<IWebSocketResponse> {
    // COMMAND 분할
    const cmdSplit = request.command.split(".");
    const serviceName = cmdSplit[0];
    const methodName = cmdSplit[1];

    // 서비스 가져오기
    const serviceClass = this._option.services.single(item => item.name === serviceName);
    if (!serviceClass) {
      throw new Exception(`서비스[${serviceName}]를 찾을 수 없습니다.`);
    }

    const service = new serviceClass();
    service.request = request;
    service.server = this;

    // 메소드 가져오기
    const method = service[methodName];
    if (!method) {
      throw new Exception(`메소드[${serviceName}.${methodName}]를 찾을 수 없습니다.`);
    }

    // 실행
    const result = await method.apply(service, request.params);
    if (result instanceof FileResult) {
      const fileToken = Uuid.newUuid().toString();
      this._preparedFileResults.set(fileToken.toString(), result);
      return {
        requestId: request.id,
        type: "file",
        body: fileToken
      };
    }
    else {
      return {
        requestId: request.id,
        type: "response",
        body: result
      };
    }
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
