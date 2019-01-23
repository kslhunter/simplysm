import * as WebSocket from "ws";
import * as http from "http";
import {EventEmitter} from "events";
import {JsonConvert, Logger} from "@simplysm/common";
import {ISdWebSocketEmitResponse, ISdWebSocketRequest, ISdWebSocketResponse} from "@simplysm/ws-common";

export class SdWebSocketServerConnection extends EventEmitter {
  private readonly _logger = new Logger("@simplysm/ws-server", "SdServerConnection");
  private readonly _splitRequestMap = new Map<number, { timer: NodeJS.Timer; bufferStrings: string[] }>();
  private readonly origin: string;

  public get isOpen(): boolean {
    return this._conn.readyState === WebSocket.OPEN;
  }

  public constructor(private readonly _conn: WebSocket, req: http.IncomingMessage) {
    super();
    this.origin = req.headers.origin!.toString();

    this._conn.on("close", async () => {
      this._splitRequestMap.clear();
      this.emit("close");
    });

    this._conn.on("message", async (msg: string) => {
      await this._onMessageAsync(msg);
    });
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>(resolve => {
      this._conn.on("close", () => {
        resolve();
      });

      this._conn.close();
    });
  }

  public async sendAsync(data: ISdWebSocketResponse | ISdWebSocketEmitResponse): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._conn.send(JsonConvert.stringify(data), err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  private async _onMessageAsync(msg: string): Promise<void> {
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
          timer: setTimeout(() => {
            this._logger.warn(`분할요청중에 타임아웃이 발생했습니다. : ${this.origin}`);
            this._splitRequestMap.delete(requestId);
          }, 30000),
          bufferStrings: []
        });
      }

      const splitRequestValue = this._splitRequestMap.get(requestId)!;
      splitRequestValue.bufferStrings[i] = str;

      clearTimeout(splitRequestValue.timer);
      splitRequestValue.timer = setTimeout(() => {
        this._logger.warn(`분할요청중에 타임아웃이 발생했습니다. : ${this.origin}`);
        this._splitRequestMap.delete(requestId);
      }, 30000);

      const res: ISdWebSocketResponse = {
        requestId,
        type: "split",
        body: str.length
      };
      if (this.isOpen) {
        await this.sendAsync(res);
      }

      const currentLength = splitRequestValue.bufferStrings.filterExists().length;
      this._logger.log(`분할된 요청을 받았습니다 : ${this.origin} - ${i.toString().toLocaleString().padStart(length.toString().toLocaleString().length)}번째 /${length.toLocaleString()}`);

      if (currentLength !== length) {
        this._splitRequestMap.set(requestId, splitRequestValue);
        return;
      }

      clearTimeout(this._splitRequestMap.get(requestId)!.timer);
      this._splitRequestMap.delete(requestId);
      message = splitRequestValue.bufferStrings.join("");
    }
    else {
      message = msg;
    }

    // Request 파싱
    const request: ISdWebSocketRequest = JsonConvert.parse(message);

    this.emit("request", request);
  }
}
