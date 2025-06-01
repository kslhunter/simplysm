import {EventEmitter} from "events";
import {Wait} from "@simplysm/sd-core-common";
import WebSocket from "isomorphic-ws";

export class SdWebSocket extends EventEmitter {
  #ws?: WebSocket;

  override on(event: "close", listener: () => void): this;
  override on(event: "message", listener: (data: any) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  get connected(): boolean {
    return this.#ws?.readyState === WebSocket.OPEN;
  }

  constructor(private readonly _url: string) {
    super();
  }

  async connectAsync(): Promise<void> {
    if (this.#ws?.readyState === WebSocket.OPEN) return;

    // await this.closeAsync();
    await new Promise<void>((resolve, reject) => {
      if (this.#ws) {
        this.#ws.close();
      }
      this.#ws = new WebSocket(this._url);

      this.#ws.onopen = () => {
        resolve();
      };

      this.#ws.onerror = (errEvt) => {
        reject(new Error(`웹소켓을 연결하는 중 오류가 발생했습니다: ${errEvt["message"]}`));
      };

      this.#ws.onmessage = (messageEvt) => {
        this.emit("message", messageEvt.data);
      };

      this.#ws.onclose = () => {
        this.emit("close");
      };
    });
  }

  async closeAsync(): Promise<void> {
    if (
      this.#ws === undefined ||
      this.#ws.readyState === WebSocket.CLOSING ||
      this.#ws.readyState === WebSocket.CLOSED
    ) return;

    this.#ws.close();
    await Wait.until(() => this.#ws!.readyState === WebSocket.CLOSED);
    this.#ws = undefined;
  }

  async sendAsync(message: string): Promise<void> {
    try {
      await Wait.until(() => this.connected, undefined, 5000);
    }
    catch {
      throw new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요.");
    }
    this.#ws!.send(message);
  }
}
