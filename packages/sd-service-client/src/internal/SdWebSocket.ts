import { EventEmitter } from "events";
import { Wait } from "@simplysm/sd-core-common";
import WebSocket from "isomorphic-ws";

export class SdWebSocket extends EventEmitter {
  #ws?: WebSocket;

  override on(event: "close", listener: () => void): this;
  override on(event: "message", listener: (data: Buffer) => void): this;
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

    await new Promise<void>((resolve, reject) => {
      if (this.#ws) {
        try {
          this.#ws.close();
        } catch {}
      }
      this.#ws = new WebSocket(this._url + "?v=2");

      this.#ws.binaryType = "arraybuffer";

      this.#ws.onopen = () => {
        resolve();
      };

      this.#ws.onerror = (errEvt) => {
        // isomorphic-ws의 에러 이벤트 타입 호환성 처리
        const msg =
          (errEvt as any).message ?? (errEvt as any).error?.message ?? "Unknown WebSocket Error";
        reject(new Error(`웹소켓 연결 오류: ${msg}`));
      };

      this.#ws.onmessage = (messageEvt) => {
        const rawData = messageEvt.data;
        let bufferData: Buffer;

        // Node.js(Buffer)와 Browser(ArrayBuffer) 환경 차이 해소
        if (Buffer.isBuffer(rawData)) {
          bufferData = rawData;
        } else if (rawData instanceof ArrayBuffer) {
          bufferData = Buffer.from(rawData);
        } else if (Array.isArray(rawData)) {
          // node 'ws'의 경우 드물게 Buffer[]가 올 수 있음
          bufferData = Buffer.concat(rawData);
        } else {
          // string인 경우 등
          bufferData = Buffer.from(rawData as any);
        }

        this.emit("message", bufferData);
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
    )
      return;

    this.#ws.close();
    await Wait.until(() => this.#ws!.readyState === WebSocket.CLOSED);
    this.#ws = undefined;
  }

  async sendAsync(buf: Buffer): Promise<void> {
    try {
      await Wait.until(() => this.connected, undefined, 5000);
    } catch {
      throw new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요.");
    }
    this.#ws!.send(buf);
  }
}
