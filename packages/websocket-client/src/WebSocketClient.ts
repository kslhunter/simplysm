import {JsonConvert, Wait} from "@simplism/core";
import {IWebSocketRequest, IWebSocketResponse} from "./interfaces";

export class WebSocketClient {
  private static _lastRequestId = 0;
  private readonly _requestMap = new Map<number | string, (response: IWebSocketResponse) => void>();
  private _ws?: WebSocket;
  private _url?: string;

  public get connected(): boolean {
    return !!this._ws && this._ws.readyState === WebSocket.OPEN;
  }

  public async connectAsync(url?: string): Promise<void> {
    this._url = url || location.host;
    await new Promise<void>(resolve => {
      this._ws = new WebSocket(`ws://${this._url}`);

      this._ws.onopen = () => resolve();

      this._ws.onmessage = message => {
        const response: IWebSocketResponse = JsonConvert.parse(message.data);

        // 요청맵.콜백 수행
        this._requestMap.get(response.requestId)!(response);
      };

      this._ws.onclose = () => {
        setTimeout(() => this.connectAsync(url), 300);
      };
    });
  }

  public async closeAsync(): Promise<void> {
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

  public async on(eventKey: string, info: any | undefined, callback: (result?: any) => void | Promise<void>): Promise<void> {
    await this.sendAsync("__addListener__", eventKey, info);

    // 이벤트에 대한 요청맵.콜백 등록
    this._requestMap.set(eventKey, response => {
      // 에러응답 처리
      if (response.type === "error") {
        throw new Error(response.body);
      }
      // 파일 응답 처리
      else if (response.type === "file") {
        const downloadUrl = `http://${this._url}/__download__/${response.body}`;
        const anchorElement = document.createElement("a");
        anchorElement.href = downloadUrl;
        anchorElement.click();
        callback();
      }
      // 일반 응답 반환
      else {
        callback(response.body);
      }
    });
  }

  public async off(eventKey: string): Promise<void> {
    await this.sendAsync("__removeListener__", eventKey);
    this._requestMap.delete(eventKey);
  }

  public async sendAsync(command: string, ...params: any[]): Promise<any> {
    return await new Promise<any>(async (resolve, reject) => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
        await Wait.time(1000);
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
          throw new Error("웹 소켓이 연결되어있지 않습니다.");
        }
      }

      // 요청맵.콜백 등록
      const requestId = WebSocketClient._lastRequestId++;
      this._requestMap.set(requestId, response => {
        // 요청맵 삭제
        this._requestMap.delete(requestId);

        // 에러응답 처리
        if (response.type === "error") {
          reject(new Error(response.body));
        }
        // 파일 응답 처리
        else if (response.type === "file") {
          const downloadUrl = `http://${this._url}/__download__/${response.body}`;
          const anchorElement = document.createElement("a");
          anchorElement.href = downloadUrl;
          anchorElement.click();
          resolve();
        }
        // 일반 응답 반환
        else {
          resolve(response.body);
        }
      });

      // 요청 보내기
      const request: IWebSocketRequest = {
        id: requestId,
        command,
        params
      };
      this._ws.send(JsonConvert.stringify(request));
    });
  }
}
