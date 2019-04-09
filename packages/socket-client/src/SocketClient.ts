import {ISocketRequest, ISocketResponse} from "@simplism/socket-common";
import {JsonConvert, Wait} from "@simplism/core";

export class SocketClient {
  private static _lastReqId = 0;
  private static readonly _wsMap = new Map<string, WebSocket>();
  private readonly _reqMap = new Map<number | string, (response: ISocketResponse) => void>();
  private _ws?: WebSocket;
  private _url?: string;
  private readonly _eventListeners = new Map<number, (data: any) => Promise<void> | void>();

  public get connected(): boolean {
    return !!this._ws && this._ws.readyState === WebSocket.OPEN;
  }

  public async connectAsync(port?: number, host?: string): Promise<void> {
    const url = `${host || location.hostname}:${port || location.port || 80}`;
    this._url = url;

    await new Promise<void>(resolve => {
      if (SocketClient._wsMap.has(url)) {
        this._ws = SocketClient._wsMap.get(url)!;
        resolve();
      }
      else {
        this._ws = new WebSocket(`ws://${url}`);
        SocketClient._wsMap.set(url, this._ws);

        this._ws.onopen = () => {
          resolve();
        };
      }

      this._ws.onmessage = message => {
        const obj = JsonConvert.parse(message.data);

        if (obj.eventListenerId) {
          this._eventListeners.get(obj.eventListenerId)!(obj.data);
        }
        else {
          const response: ISocketResponse = obj;

          // 요청맵.콜백 수행
          this._reqMap.get(response.requestId)!(response);
        }
      };

      // 닫히면, 자동 재연결
      this._ws.onclose = () => {
        setTimeout(
          async () => {
            await this.connectAsync(port, host);
          },
          300
        );
      };
    });
  }

  public async addEventListenerAsync(eventName: string, info: any, cb: (data: any) => Promise<void> | void): Promise<number> {
    const id = await this.sendAsync("addEventListener", [eventName, info]);
    this._eventListeners.set(id, cb);
    return id;
  }

  public async removeEventListenerAsync(id: number): Promise<void> {
    await this.sendAsync("removeEventListener", [id]);
    this._eventListeners.delete(id);
  }

  public async emitEventAsync(eventName: string, infoSelector: (item: any) => boolean, data: any): Promise<void> {
    const events: { id: number; info: object }[] = await this.sendAsync("getEventListeners", [eventName]);
    await this.sendAsync("emitEvent", [events.filter(item => infoSelector(item.info)).map(item => item.id), data]);
  }

  public async closeAsync(): Promise<void> {
    SocketClient._wsMap.delete(this._url!);

    if (!this.connected) {
      this._ws = undefined;
      return;
    }

    await new Promise<void>(resolve => {
      this._ws!.onclose = () => {
        this._ws = undefined;
        resolve();
      };
      this._ws!.close();
    });
  }

  public async sendAsync(command: string, params: any[], sendProgressCallback?: (progress: { current: number; total: number }) => void): Promise<any> {
    return await new Promise<any>(async (resolve, reject) => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
        await Wait.time(1000);
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
          throw new Error("웹 소켓이 연결되어있지 않습니다.");
        }
      }

      const requestId = SocketClient._lastReqId++;
      const request: ISocketRequest = {
        id: requestId,
        command,
        params
      };
      const requestJson = JsonConvert.stringify(request)!;

      const splitLength = 1000000;
      if (requestJson.length > splitLength && sendProgressCallback) {
        sendProgressCallback({
          current: 0,
          total: requestJson.length
        });
      }

      // 요청맵.콜백 등록
      let splitCompletedLength = 0;
      this._reqMap.set(requestId, response => {
        // 에러응답 처리
        if (response.type === "error") {
          // 요청맵 삭제
          this._reqMap.delete(requestId);

          reject(new Error(response.body));
        }
        // split 응답 처리
        else if (response.type === "split") {
          splitCompletedLength += response.body;
          if (sendProgressCallback) {
            sendProgressCallback({
              current: splitCompletedLength,
              total: requestJson.length
            });
          }
        }
        // 일반 응답 반환
        else {
          // 요청맵 삭제
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
          this._ws.send(str);
          cursor += splitLength;
          i++;
          await Wait.time(10);
        }
      }
      else {
        this._ws.send(requestJson);
      }
    });
  }
}
