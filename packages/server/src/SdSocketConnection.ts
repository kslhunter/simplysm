import * as WebSocket from "ws";
import {DateTime, ISdSocketRequest, ISdSocketResponse, JsonConvert, Logger} from "@simplysm/common";

export type SdSocketConnectionCloseListenerFunction = () => (void | Promise<void>);
export type SdSocketConnectionRequestListenerFunction = (request: ISdSocketRequest) => (Promise<ISdSocketResponse | undefined> | ISdSocketResponse | undefined);

export class SdSocketConnection {
  private readonly _logger = new Logger("@simplysm/server", "SdSocketConnection");
  private readonly _splitRequestMap = new Map<number, {
    expiryDateTime: DateTime;
    bufferStrings: string[];
  }>();
  private _splitRequestClearInterval?: NodeJS.Timeout;
  private readonly _closeListenerMap = new Map<string, SdSocketConnectionCloseListenerFunction>();
  private readonly _requestListenerMap = new Map<string, SdSocketConnectionRequestListenerFunction>();

  public get isOpen(): boolean {
    return this._conn.readyState === WebSocket.OPEN;
  }

  public constructor(private readonly _conn: WebSocket) {
    this._conn.on("close", async () => {
      for (const closeListener of Object.values(this._closeListenerMap)) {
        await closeListener();
      }

      clearInterval(this._splitRequestClearInterval!);
      this._splitRequestClearInterval = undefined;
      this._splitRequestMap.clear();
      this._closeListenerMap.clear();
      this._requestListenerMap.clear();
    });

    this._conn.on("message", async (msg: string) => {
      await this._onRequestAsync(msg);
    });

    this._splitRequestClearInterval = setInterval(() => {
      for (const key of Array.from(this._splitRequestMap.keys())) {
        const value = this._splitRequestMap.get(key)!;
        if (value.expiryDateTime.tick < new DateTime().tick) {
          this._splitRequestMap.delete(key);
        }
      }
    }, 30 * 1000);
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>(resolve => {
      this._conn.on("close", () => {
        resolve();
      });

      this._conn.close();
    });
  }

  public async sendAsync(data: any): Promise<void> {
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

  public addCloseListener(key: string, listener: SdSocketConnectionCloseListenerFunction): void {
    this._closeListenerMap.set(key, listener);
  }

  public removeCloseListener(key: string): void {
    this._closeListenerMap.delete(key);
  }

  public addRequestListener(key: string, listener: SdSocketConnectionRequestListenerFunction): void {
    this._requestListenerMap.set(key, listener);
  }

  public removeRequestListener(key: string): void {
    this._requestListenerMap.delete(key);
  }

  private async _onRequestAsync(msg: string): Promise<void> {
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

      const res: ISdSocketResponse = {
        requestId,
        type: "split",
        body: str.length
      };
      if (this.isOpen) {
        await this.sendAsync(res);
      }

      const currentLength = splitRequestValue.bufferStrings.filterExists().length;
      this._logger.log(`분할된 요청을 받았습니다 : ${i.toString().toLocaleString().padStart(length.toString().toLocaleString().length)}번째 /${length.toLocaleString()}`);

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
    const request: ISdSocketRequest = JsonConvert.parse(message);
    this._logger.log(`요청을 받았습니다 : ${JsonConvert.stringify(request, {hideBuffer: true})}`);

    // 요청처리
    let response: ISdSocketResponse | undefined;
    try {
      for (const requestListener of Object.values(this._requestListenerMap)) {
        response = await requestListener(request);
        if (response) {
          break;
        }
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

    if (!response) {
      this._logger.error("명령에 대한 응답이 지정되지 있지 않습니다.");
      response = {
        requestId: request.id,
        type: "error",
        body: "명령에 대한 응답이 지정되지 있지 않습니다."
      };
    }

    // 결과 전송
    this._logger.log(`결과를 반환했습니다 : ${JsonConvert.stringify(response, {hideBuffer: true})}`);
    if (this.isOpen) {
      await this.sendAsync(response);
    }
  }
}
