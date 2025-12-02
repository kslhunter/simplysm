import { EventEmitter } from "events";
import { Uuid, Wait } from "@simplysm/sd-core-common";
import WebSocket from "isomorphic-ws";

export class SdWebSocketWrapper extends EventEmitter {
  #clientId = Uuid.new().toString();
  #ws?: WebSocket;

  override on(event: "close", listener: () => void): this;
  override on(event: "message", listener: (data: Buffer) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  get connected(): boolean {
    return this.#ws?.readyState === WebSocket.OPEN;
  }

  constructor(
    private readonly _url: string,
    private readonly _clientName: string,
  ) {
    super();
  }

  async connectAsync(): Promise<void> {
    if (this.#ws?.readyState === WebSocket.OPEN) return;
    if (this.#ws) {
      this.#ws.close();
      this.#ws = undefined;
    }

    await new Promise<void>((resolve, reject) => {
      const params = new URLSearchParams({
        ver: "2",
        clientId: this.#clientId,
        clientName: this._clientName,
      });
      this.#ws = new WebSocket(`${this._url}?${params.toString()}`);
      this.#ws.binaryType = "arraybuffer";

      const handleOpen = () => {
        cleanupListeners();
        resolve();
      };

      const handleError = (event: any) => {
        const msg = event.message ?? event.error?.message ?? "Unknown WebSocket Error";
        reject(new Error(`웹소켓 연결 오류: ${msg}`));
      };

      const handleCloseInitial = (event: WebSocket.CloseEvent) => {
        cleanupListeners();
        reject(new Error(`WebSocket 연결 거부됨 (Code: ${event.code})`));
      };

      this.#ws.addEventListener("open", handleOpen);
      this.#ws.addEventListener("error", handleError);
      this.#ws.addEventListener("close", handleCloseInitial);

      const cleanupListeners = () => {
        this.#ws?.removeEventListener("open", handleOpen);
        this.#ws?.removeEventListener("error", handleError);
        this.#ws?.removeEventListener("close", handleCloseInitial);
      };
    });

    this.#ws!.onmessage = (messageEvt) => {
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

    this.#ws!.onclose = () => {
      this.emit("close");
    };
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
