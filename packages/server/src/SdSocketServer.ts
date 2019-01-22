import * as http from "http";
import * as express from "express";
import * as WebSocket from "ws";
import {ISdSocketRequest, ISdSocketResponse, Logger, Uuid} from "@simplysm/common";
import * as path from "path";
import {SdSocketConnection} from "./SdSocketConnection";

export interface ISdSocketServerEventListener {
  id: number;
  eventName: string;
  info: object;
  conn: SdSocketConnection;
}

export class SdSocketServer {
  private readonly _logger = new Logger("@simplysm/server", "SdSocketServer");

  public app?: express.Application;
  private _http?: http.Server;
  private _socket?: WebSocket.Server;
  private _eventListeners: ISdSocketServerEventListener[] = [];
  private _connections: SdSocketConnection[] = [];

  public isProcessing = false;

  public async startAsync(port?: number): Promise<void> {
    if (this.isProcessing) {
      throw new Error("서버가 이미 실행중입니다.");
    }
    this.isProcessing = true;

    await new Promise<void>((resolve, reject) => {
      this.app = express();
      this.app.use(express.static("www"));

      this._http = http.createServer(this.app);
      this._socket = new WebSocket.Server({server: this._http});

      // SOCKET 서버
      this._socket.on("connection", async (socketConn, req) => {
        await this._onSocketConnectionAsync(socketConn, req);
      });

      this._http.listen(port || 80, (err: Error) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });

      this._http.on("close", () => {
        this.app = undefined;
        this._socket = undefined;
        this._http = undefined;
        this._eventListeners = [];
        this._connections = [];
        this.isProcessing = false;
      });
    });
  }

  public async closeAsync(): Promise<void> {
    if (!this.isProcessing) {
      throw new Error("서버가 이미 중지되었습니다.");
    }
    this.isProcessing = false;

    await Promise.all(this._connections.map(async conn => {
      await conn.closeAsync();
    }));

    await new Promise<void>((resolve, reject) => {
      this._socket!.close(err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      this._http!.close((err: Error) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  public async emitAsync(id: number, data: any): Promise<void> {
    const eventListener = this._eventListeners.single(item => item.id === id);
    if (!eventListener) return;

    await eventListener.conn.sendAsync({
      eventListenerId: eventListener.id,
      data
    });
  }

  private async _onSocketConnectionAsync(wsConn: WebSocket, req: http.IncomingMessage): Promise<void> {
    this._logger.log(`클라이언트의 연결 요청을 받았습니다 : ${req.connection.remoteAddress}`);
    const conn = new SdSocketConnection(wsConn);
    this._connections.push(conn);

    const uuid = Uuid.newUuid().toString();
    conn.addRequestListener(uuid, async (request: ISdSocketRequest): Promise<ISdSocketResponse> => {
      if (request.command === "addEventListener") {
        const eventListenerId = (this._eventListeners.max(item => item.id) || 0) + 1;

        this._eventListeners.push({
          id: eventListenerId,
          eventName: request.params[0],
          info: request.params[1],
          conn
        });

        return {
          requestId: request.id,
          type: "response",
          body: eventListenerId
        };
      }

      if (request.command === "getEventListeners") {
        const eventName = request.params[0];

        return {
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
          await this.emitAsync(id, data);
        }

        return {
          requestId: request.id,
          type: "response"
        };
      }
      else {
        return await this._onSocketRequest(conn, request);
      }
    });

    conn.addCloseListener(uuid, () => {
      this._eventListeners.remove(item => item.conn === conn);
      this._connections.remove(conn);
    });
  }

  private async _onSocketRequest(conn: SdSocketConnection, request: ISdSocketRequest): Promise<ISdSocketResponse> {
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
    service.conn = conn;

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
