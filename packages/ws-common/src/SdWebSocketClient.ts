//tslint:disable:no-null-keyword

import {JsonConvert, Logger, Type, Wait} from "@simplysm/common";
import {ISdWebSocketRequest, ISdWebSocketResponse} from "./commons";

export class SdWebSocketClient {
  private readonly _logger = new Logger("@simplysm/angular", "SdSocketClient");
  private _ws?: WebSocket;
  private readonly _eventListeners = new Map<number, (data: any) => (Promise<void> | void)>();
  private readonly _reqMap = new Map<number, (response: ISdWebSocketResponse) => void>();

  public constructor(private readonly _port?: number,
                     private readonly _host?: string,
                     private readonly _protocol?: "ws" | "http") {
  }

  public async connectAsync(): Promise<void> {

    await new Promise<void>((resolve, reject) => {
      this._ws = new WebSocket(`${this._protocol || "ws"}://${this._host || location.hostname}:${this._port || location.port}`);
      this._ws.onopen = () => {
        this._ws!.onopen = null;
        resolve();
      };

      this._ws.onmessage = message => {
        const obj = JsonConvert.parse(message.data);

        if (obj.eventListenerId) {
          this._eventListeners.get(obj.eventListenerId)!(obj.data);
        }
        else {
          const response: ISdWebSocketResponse = obj;
          this._reqMap.get(response.requestId)!(response);
        }
      };

      this._ws.onerror = err => {
        this._logger.error(err);
        reject(err);
      };

      this._ws.onclose = () => {
        this._ws!.onopen = null;
        this._ws!.onmessage = null;
        this._ws!.onerror = null;
        this._ws = undefined;

        setTimeout(async () => {
          await this.connectAsync();
        }, 1000);
      };
    });
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>(resolve => {
      this._ws!.onclose = () => {
        this._ws!.onopen = null;
        this._ws!.onmessage = null;
        this._ws!.onerror = null;
        this._ws = undefined;

        resolve();
      };
      this._ws!.close();
    }).catch(err => {
      this._logger.warn(err);
      delete this._ws;
    });
  }

  public async addEventListenerAsync<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, info: T["info"], cb: (data: T["data"]) => (Promise<void> | void)): Promise<void> {
    const id = await this.sendAsync("addEventListener", [eventType.name, info]);
    this._eventListeners.set(id, cb);
  }

  public async emitAsync<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, infoSelector: (item: T["info"]) => boolean, data: T["data"]): Promise<void> {
    const events: { id: number; info: object }[] = await this.sendAsync("getEventListeners", [eventType.name]);
    await this.sendAsync("emitEvent", [events.filter(item => infoSelector(item.info)).map(item => item.id), data]);
  }

  public async sendAsync(command: string, params: any[], sendProgressCallback?: (progress: { current: number; total: number }) => void): Promise<any> {
    return await new Promise<any>(async (resolve, reject) => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
        try {
          await Wait.true(() => !!this._ws && this._ws.readyState === WebSocket.OPEN, undefined, 3000);
        }
        catch (err) {
          throw new Error("웹 소켓이 연결되어있지 않습니다.");
        }
      }

      const requestId = (Array.from(this._reqMap.keys()).max() || 0) + 1;
      const request: ISdWebSocketRequest = {
        id: requestId,
        url: `${location.protocol}//${location.host}${location.pathname}`,
        command,
        params
      };
      const requestJson = JsonConvert.stringify(request)!;

      const splitLength = 10000;
      if (requestJson.length > splitLength && sendProgressCallback) {
        sendProgressCallback({
          current: 0,
          total: requestJson.length
        });
      }

      let splitCompletedLength = 0;
      this._reqMap.set(requestId, response => {
        if (response.type === "error") {
          this._reqMap.delete(requestId);
          reject(new Error(response.body));
        }
        else if (response.type === "split") {
          splitCompletedLength += response.body;
          if (sendProgressCallback) {
            sendProgressCallback({
              current: splitCompletedLength,
              total: requestJson.length
            });
          }
        }
        else {
          this._reqMap.delete(requestId);
          resolve(response.body);
        }
      });

      // 요청 보내기
      if (requestJson.length > splitLength) {
        let i = 0;
        let cursor = 0;
        while (cursor < requestJson.length) {
          const str = "!split(" + requestId + "," + i + "," + Math.ceil(requestJson.length / splitLength) + ")!" + requestJson.slice(cursor, Math.min(cursor + splitLength, requestJson.length));
          this._ws!.send(str);
          cursor += splitLength;
          i++;
          await Wait.time(10);
        }
      }
      else {
        this._ws!.send(requestJson);
      }
    });
  }
}

export class SdServiceEventBase<I, O> {
  public info!: I;
  public data!: O;
}
