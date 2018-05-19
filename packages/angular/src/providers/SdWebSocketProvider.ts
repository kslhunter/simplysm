import {Injectable, OnDestroy} from "@angular/core";
import {Wait} from "../../../common/utils/Wait";

@Injectable()
export class SdWebSocketProvider implements OnDestroy {
  private static _lastRequestId = 0;
  private readonly _requestMap = new Map<number, { event: "response" | "error"; payload?: any } | undefined>();
  private _ws?: WebSocket;

  public get connected(): boolean {
    return !!this._ws && this._ws.readyState === WebSocket.OPEN;
  }

  public async connectAsync(url: string): Promise<void> {
    await new Promise<void>(resolve => {
      this._ws = new WebSocket(url);

      this._ws.onopen = () => resolve();

      this._ws.onmessage = async message => {
        const response = JSON.parse(message.data);

        // 요청에 대한 응답 채우기
        this._requestMap.set(response.requestId, {
          event: response.event,
          payload: response.payload
        });
      };

      this._ws.onclose = () => {
        setTimeout(
          async () => await this.connectAsync(url),
          300
        );
      };
    });
  }

  public async sendAsync(cmd: string, params?: any): Promise<any> {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      await Wait.time(1000);
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
        throw new Error("웹 소켓이 연결되어있지 않습니다.");
      }
    }

    // 요청 맵에 추가
    const requestId = SdWebSocketProvider._lastRequestId++;
    this._requestMap.set(requestId, undefined);
    const request = JSON.stringify({id: requestId, cmd, params});

    // 요청 보내기
    this._ws.send(request);

    // 요청에 대한 응답이 채워질 때 까지 기다리기
    await Wait.true(() => !!this._requestMap.get(requestId));

    // 응답 가져오기
    const response = this._requestMap.get(requestId)!;

    // 요청 맵에서 삭제
    this._requestMap.delete(requestId);

    // 에러 처리
    if (response.event === "error") {
      throw new Error(response.payload);
    }

    // 응답 반환
    return response.payload;
  }

  public ngOnDestroy(): void {
    if (this._ws) {
      if (this._ws.readyState === WebSocket.OPEN) {
        this._ws.onclose = () => {
        };
        this._ws.close();
      }
      this._ws = undefined;
    }
  }
}