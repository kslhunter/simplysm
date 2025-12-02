import { DateTime, JsonConvert } from "@simplysm/sd-core-common";
import { SdLogger } from "@simplysm/sd-core-node";
import { WebSocket } from "ws";
import { EventEmitter } from "events";
import { clearInterval } from "node:timers";
import { SdServiceProtocolV1 } from "./SdServiceProtocolV1";
import { ISdServiceRequest, TSdServiceC2SMessage, TSdServiceS2CMessage } from "./protocol-v1.types";

export class SdServiceSocketV1 extends EventEmitter {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdServiceSocket"]);

  readonly #protocol = new SdServiceProtocolV1();
  readonly #listenerInfos: { eventName: string; key: string; info: any }[] = [];

  #isAlive = true;
  readonly #pingInterval: NodeJS.Timeout;

  readonly connectedAtDateTime = new DateTime();

  override on(event: "close", listener: (code: number) => void): this;
  override on(event: "request", listener: (req: ISdServiceRequest) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  constructor(private readonly _socket: WebSocket) {
    super();

    // 소켓 이벤트 바인딩
    this._socket.on("close", this.#onClose.bind(this));
    this._socket.on("error", this.#onError.bind(this));
    this._socket.on("message", this.#onMessage.bind(this));

    // 핑퐁 로직
    this._socket.on("pong", () => {
      this.#isAlive = true;
    });

    this.#pingInterval = setInterval(() => {
      if (!this.#isAlive) {
        this.close();
        return;
      }

      this.#isAlive = false;
      this._socket.ping();
    }, 10000);
  }

  private _clientId?: string;

  async getClientIdAsync(): Promise<string> {
    if (this._clientId != null) return this._clientId;

    const req: TSdServiceS2CMessage = { name: "client-get-id" };

    const socket = this._socket;

    return await new Promise<string>((resolve, reject) => {
      const tempListener = (resBuf: Buffer): void => {
        try {
          let res = JsonConvert.parse(resBuf.toString());

          if (res.name === "client-get-id-response") {
            socket.off("message", tempListener);
            this._clientId = res.body;
            resolve(res.body);
          }
        } catch (err) {
          socket.off("message", tempListener);
          reject(err);
        }
      };

      socket.on("message", tempListener);

      socket.send(JsonConvert.stringify(req));
    });
  }

  // 강제 종료
  close() {
    this._socket.terminate();
  }

  // 메시지 전송 (Protocol Encode 사용)
  send(msg: TSdServiceS2CMessage) {
    if (this._socket.readyState !== WebSocket.OPEN) return 0;

    const chunks = this.#protocol.encode(msg).chunks;
    for (const chunk of chunks) {
      this._socket.send(chunk);
    }

    return chunks.sum((item) => item.length);
  }

  addEventListener(key: string, eventName: string, info: any) {
    this.#listenerInfos.push({ key, eventName, info });
  }

  removeEventListener(key: string) {
    this.#listenerInfos.remove((item) => item.key === key);
  }

  getEventListners(eventName: string) {
    return this.#listenerInfos
      .filter((item) => item.eventName === eventName)
      .map((item) => ({ key: item.key, info: item.info }));
  }

  emitByKeys(targetKeys: string[], data: any) {
    const targets = this.#listenerInfos.filter((item) => targetKeys.includes(item.key));
    for (const target of targets) {
      this.send({
        name: "event",
        key: target.key,
        body: data,
      });
    }
  }

  // ===========================================================================

  #onError(err: Error) {
    this.#logger.error("WebSocket 클라이언트 오류 발생", err);
    this.emit("error", err);
  }

  #onClose(code: number) {
    clearInterval(this.#pingInterval);
    this.#protocol.dispose();
    this.emit("close", code);
  }

  #onMessage(msgBuffer: Buffer) {
    try {
      const decodeResult = this.#protocol.decode(msgBuffer.toString());

      // A. 분할 메시지 수신 중 -> ACK (reqUuid 사용)
      if (decodeResult.type === "accumulating") {
        this.send({
          name: "response-for-split",
          reqUuid: decodeResult.uuid,
          totalSize: decodeResult.totalSize,
          completedSize: decodeResult.completedSize,
        });
      }
      // B. 메시지 완성 -> 처리
      else {
        const msg = decodeResult.message as TSdServiceC2SMessage;
        if (msg.name === "request") {
          this.emit("request", msg);
        } else if (msg.name === "client-ping") {
          this.send({ name: "client-pong" });
        }
      }
    } catch (err) {
      this.#logger.error("WebSocket 메시지 처리 중 오류 발생", err);
    }
  }
}
