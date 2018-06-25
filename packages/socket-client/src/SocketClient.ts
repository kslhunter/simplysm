import {ISocketRequest, ISocketResponse} from "@simplism/socket-common";
import {JsonConvert, Wait} from "@simplism/core";

export class SocketClient {
  private static _lastReqId = 0;
  private static readonly _wsMap = new Map<string, WebSocket>();
  private readonly _reqMap = new Map<number | string, (response: ISocketResponse) => void>();
  private _ws?: WebSocket;
  private _url?: string;

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
        const response: ISocketResponse = JsonConvert.parse(message.data);

        // 요청맵.콜백 수행
        this._reqMap.get(response.requestId)!(response);
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

  public async sendAsync(command: string, params: any[]): Promise<any> {
    return await new Promise<any>(async (resolve, reject) => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
        await Wait.time(1000);
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
          throw new Error("웹 소켓이 연결되어있지 않습니다.");
        }
      }

      // 요청맵.콜백 등록
      const requestId = SocketClient._lastReqId++;
      this._reqMap.set(requestId, response => {
        // 요청맵 삭제
        this._reqMap.delete(requestId);

        // 에러응답 처리
        if (response.type === "error") {
          reject(new Error(response.body));
        }
        // 일반 응답 반환
        else {
          resolve(response.body);
        }
      });

      // 요청 보내기
      const request: ISocketRequest = {
        id: requestId,
        command,
        params
      };
      this._ws.send(JsonConvert.stringify(request));
    });
  }
}