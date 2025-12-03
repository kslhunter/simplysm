import { DateTime } from "@simplysm/sd-core-common";
import { SdLogger } from "@simplysm/sd-core-node";
import {
  TSdServiceClientMessage,
  TSdServiceServerMessage,
  TSdServiceServerRawMessage,
} from "@simplysm/sd-service-common";
import { WebSocket } from "ws";
import { EventEmitter } from "events";
import { clearInterval } from "node:timers";
import { SdServiceProtocolWrapper } from "./SdServiceProtocolWrapper";

export class SdServiceSocket extends EventEmitter {
  private readonly _PING_INTERVAL = 5000; // 5초마다 핑 전송
  private readonly _PONG_PACKET = Buffer.from([0x02]);

  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdServiceSocket"]);

  readonly #protocol = new SdServiceProtocolWrapper();
  readonly #listenerInfos: { eventName: string; key: string; info: any }[] = [];

  #isAlive = true;
  readonly #pingTimer: NodeJS.Timeout;

  readonly connectedAtDateTime = new DateTime();

  override on(event: "close", listener: (code: number) => void): this;
  override on(
    event: "message",
    listener: (uuid: string, message: TSdServiceClientMessage) => void,
  ): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  constructor(
    private readonly _socket: WebSocket,
    private readonly _clientId: string,
    public readonly clientName: string,
  ) {
    super();

    // 소켓 이벤트 바인딩
    this._socket.on("close", this.#onClose.bind(this));
    this._socket.on("error", this.#onError.bind(this));
    this._socket.on("message", this.#onMessage.bind(this));

    // 핑퐁 로직
    this._socket.on("pong", () => {
      this.#isAlive = true;
    });

    this.#pingTimer = setInterval(() => {
      if (!this.#isAlive) {
        this.close();
        return;
      }

      this.#isAlive = false;
      this._socket.ping();
    }, this._PING_INTERVAL);
  }

  // 강제 종료
  close() {
    this._socket.terminate();
  }

  // 메시지 전송 (Protocol Encode 사용)
  async sendAsync(uuid: string, msg: TSdServiceServerMessage) {
    return await this.#sendAsync(uuid, msg);
  }

  async #sendAsync(uuid: string, msg: TSdServiceServerRawMessage) {
    if (this._socket.readyState !== WebSocket.OPEN) return 0;

    const chunks = await this.#protocol.encodeAsync(uuid, msg);
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

  filterEventTargetKeys(targetKeys: string[]) {
    const targets = this.#listenerInfos.filter((item) => targetKeys.includes(item.key));
    return targets.map((item) => item.key);
  }

  // ===========================================================================

  #onError(err: Error) {
    this.#logger.error("WebSocket 클라이언트 오류 발생", err);
    this.emit("error", err);
  }

  #onClose(code: number) {
    clearInterval(this.#pingTimer);
    this.#protocol.dispose();
    this.emit("close", code);
  }

  async #onMessage(msgBuffer: Buffer) {
    try {
      // ping에 대한 pong처리
      if (msgBuffer.length === 1 && msgBuffer[0] === 0x01) {
        // 즉시 Pong 응답 (await 불필요, 워커 불필요)
        if (this._socket.readyState === WebSocket.OPEN) {
          this._socket.send(this._PONG_PACKET);
        }
        return; // 여기서 종료
      }

      const decodeResult = await this.#protocol.decodeAsync(msgBuffer);
      if (decodeResult.type === "progress") {
        await this.#sendAsync(decodeResult.uuid, {
          name: "progress",
          body: {
            totalSize: decodeResult.totalSize,
            completedSize: decodeResult.completedSize,
          },
        });
      } else {
        const msg = decodeResult.message as TSdServiceClientMessage;
        this.emit("message", decodeResult.uuid, msg);
      }
    } catch (err) {
      this.#logger.error("WebSocket 메시지 처리 중 오류 발생", err);
    }
  }
}
