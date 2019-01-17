import * as http from "http";
import * as express from "express";
import * as WebSocket from "ws";
import {DateTime, ISdServerRequest, ISdServerResponse, JsonConvert, Logger} from "@simplysm/common";
import * as path from "path";

export interface ISdSocketServerEventListener {
  id: number;
  eventName: string;
  info: object;
  conn: WebSocket;
}

export class SdSocketServer {
  private readonly _logger = new Logger("@simplysm/server", "SdSocketServer");

  public app?: express.Application;
  private _http?: http.Server;
  private _socket?: WebSocket.Server;
  private _splitRequestClearInterval?: NodeJS.Timeout;
  private _eventListeners: ISdSocketServerEventListener[] = [];
  private readonly _splitRequestMap = new Map<number, {
    expiryDateTime: DateTime;
    bufferStrings: string[];
  }>();
  private readonly _conns: WebSocket[] = [];

  private _isStarted = false;

  public addCloseListener(conn: WebSocket, listener: () => (void | Promise<void>)): void {
    conn.on("close", async () => {
      await listener();
    });
  }

  public async startAsync(port?: number, host?: string): Promise<void> {
    if (this._isStarted) {
      throw new Error("서버가 이미 실행중입니다.");
    }
    this._isStarted = true;

    await new Promise<void>((resolve, reject) => {
      this.app = express();
      this.app.use(express.static("www"));

      this._http = http.createServer(this.app);
      this._socket = new WebSocket.Server({server: this._http});

      // SOCKET 서버
      this._socket.on("connection", async (socketConn, req) => {
        await this._onSocketConnection(socketConn, req);
      });

      this._http.listen(port || 80, host, (err: Error) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });

      this._splitRequestClearInterval = setInterval(() => {
        for (const key of Array.from(this._splitRequestMap.keys())) {
          const value = this._splitRequestMap.get(key)!;
          if (value.expiryDateTime.tick < new DateTime().tick) {
            this._splitRequestMap.delete(key);
          }
        }
      }, 30 * 1000);
    });
  }

  public async closeAsync(): Promise<void> {
    if (!this._isStarted) return;
    this._isStarted = false;

    clearInterval(this._splitRequestClearInterval!);
    this._splitRequestClearInterval = undefined;

    await new Promise<void>(async (resolve, reject) => {
      await Promise.all(this._conns.map(async conn => {
        await new Promise<void>(resolve1 => {
          conn.on("close", () => {
            resolve1();
          });

          conn.close();
        });
      }));

      this._socket!.close(err => {
        if (err) {
          reject(err);
          return;
        }

        this._http!.close((err1: Error) => {
          if (err1) {
            reject(err1);
            return;
          }

          this._eventListeners = [];
          this._splitRequestMap.clear();
        });
      });
    });
  }

  public emit(id: number, data: any): void {
    const eventListener = this._eventListeners.single(item => item.id === id);
    if (!eventListener) return;

    if (eventListener.conn.readyState === WebSocket.OPEN) {
      eventListener.conn.send(JsonConvert.stringify({
        eventListenerId: eventListener.id,
        data
      }));
    }
    else {
      this._eventListeners.remove(eventListener);
    }
  }

  private async _onSocketConnection(conn: WebSocket, req: http.IncomingMessage): Promise<void> {
    this._logger.log(`클라이언트의 연결 요청을 받았습니다 : ${req.connection.remoteAddress}`);
    this._conns.push(conn);

    conn.on("message", async (msg: string) => {
      let message;

      // 부분 요청 합치
      const splitRegexp = /^!split\(([0-9]*),([0-9]*),([0-9]*)\)!(.*)/;
      if (splitRegexp.test(msg)) {
        const match = msg.match(splitRegexp)!;
        const requestId = Number(match[1]);
        const i = Number(match[2]);
        const length = Number(match[3]);
        const str = match[4];

        if (!this._splitRequestMap.has(requestId)) {
          this._splitRequestMap.set(requestId, {
            expiryDateTime: new DateTime().addMinutes(1),
            bufferStrings: []
          });
        }

        const splitRequestValue = this._splitRequestMap.get(requestId)!;
        splitRequestValue.bufferStrings[i] = str;
        splitRequestValue.expiryDateTime = new DateTime().addMinutes(1);

        const res: ISdServerResponse = {
          requestId,
          type: "split",
          body: str.length
        };
        const resJson = JsonConvert.stringify(res);
        if (conn.readyState === WebSocket.OPEN) {
          conn.send(resJson);
        }

        const currentLength = splitRequestValue.bufferStrings.filterExists().length;
        this._logger.log(`분할된 요청을 받았습니다 : ${req.headers.origin} - ${i.toString().toLocaleString().padStart(length.toString().toLocaleString().length)}번째 /${length.toLocaleString()}`);

        if (currentLength !== length) {
          this._splitRequestMap.set(requestId, splitRequestValue);
          return;
        }

        this._splitRequestMap.delete(requestId);
        message = splitRequestValue.bufferStrings.join("");
      }
      else {
        message = msg;
      }

      // Request 파싱
      const request: ISdServerRequest = JsonConvert.parse(message);
      this._logger.log(`요청을 받았습니다 : ${req.headers.origin} - ${JsonConvert.stringify(request, {hideBuffer: true})}`);

      // 요청처리
      let response: ISdServerResponse;
      try {
        if (request.command === "addEventListener") {
          const eventListenerId = (this._eventListeners.max(item => item.id) || 0) + 1;

          this._eventListeners.push({
            id: eventListenerId,
            eventName: request.params[0],
            info: request.params[1],
            conn
          });

          response = {
            requestId: request.id,
            type: "response",
            body: eventListenerId
          };
        }
        else if (request.command === "getEventListeners") {
          const eventName = request.params[0];

          response = {
            requestId: request.id,
            type: "response",
            body: this._eventListeners
              .filter(item => item.eventName === eventName)
              .map(item => ({
                id: item.id,
                info: item.info
              }))
          };
        }
        else if (request.command === "emitEvent") {
          const ids: number[] = request.params[0];
          const data = request.params[1];

          for (const id of ids) {
            this.emit(id, data);
          }

          response = {
            requestId: request.id,
            type: "response"
          };
        }
        else {
          response = await this._onSocketRequest(request);
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
      this._logger.log(`결과를 반환했습니다 : ${req.headers.origin} - ${JsonConvert.stringify(response, {hideBuffer: true})}`);
      const responseJson = JsonConvert.stringify(response);
      if (conn.readyState === WebSocket.OPEN) {
        conn.send(responseJson);
      }
    });

    conn.on("close", () => {
      this._eventListeners.remove(item => item.conn === conn);
      this._conns.remove(conn);
    });
  }

  private async _onSocketRequest(request: ISdServerRequest): Promise<ISdServerResponse> {
    // COMMAND 분할
    const cmdSplit = request.command.split(".");
    const serviceName = cmdSplit[0];
    const methodName = cmdSplit[1];

    // 서비스 가져오기
    const serviceFileAddr = path.resolve(__dirname, "services", `${serviceName}`);
    const serviceClass = require(serviceFileAddr)[serviceName];

    const service = new serviceClass();
    service.request = request;
    service.server = this;

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
}
