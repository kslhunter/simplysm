import { EventEmitter } from "events";
import { Wait } from "@simplysm/sd-core-common";

export class SdWebSocket extends EventEmitter {
  private _ws?: WebSocket;

  public override on(event: "close", listener: () => void): this;
  public override on(event: "message", listener: (data: any) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public get connected(): boolean {
    return this._ws?.readyState === WebSocket.OPEN;
  }

  public constructor(private readonly _url: string) {
    super();
  }

  public async connectAsync(): Promise<void> {
    if (this.connected) return;

    await new Promise<void>((resolve, reject) => {
      this._ws = new WebSocket(this._url);

      this._ws.onopen = () => {
        resolve();
      };

      this._ws.onerror = (errEvt) => {
        reject(new Error(`웹소켓을 연결하는 중 오류가 발생했습니다: ${errEvt["message"]}`));
      };

      this._ws.onmessage = (messageEvt) => {
        this.emit("message", messageEvt.data);
      };

      this._ws.onclose = () => {
        this.emit("close");
      };
    });
  }

  public async closeAsync(): Promise<void> {
    if (!this.connected) return;

    this._ws!.close();
    await Wait.until(() => !this.connected);
    delete this._ws;
  }

  public async sendAsync(message: string): Promise<void> {
    try {
      await Wait.until(() => this.connected, undefined, 5000);
    }
    catch (err) {
      throw new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요.");
    }
    this._ws!.send(message);
  }
}
