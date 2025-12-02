import { DateTime } from "@simplysm/sd-core-common";
import { SdLogger } from "@simplysm/sd-core-node";
import {
  SdServiceProtocolV2,
  TSdServiceClientMessage,
  TSdServiceClientRawMessage,
  TSdServiceServerMessage,
  TSdServiceServerRawMessage,
} from "@simplysm/sd-service-common";
import { WebSocket } from "ws";
import { EventEmitter } from "events";
import { clearInterval } from "node:timers";

export class SdServiceSocketV2 extends EventEmitter {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdServiceSocket"]);

  readonly #protocol = new SdServiceProtocolV2();
  readonly #listenerInfos: { eventName: string; key: string; info: any }[] = [];

  #isAlive = true;
  readonly #pingInterval: NodeJS.Timeout;

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

    this.#pingInterval = setInterval(() => {
      if (!this.#isAlive) {
        this.close();
        return;
      }

      this.#isAlive = false;
      this._socket.ping();
    }, 10000);
  }

  // 강제 종료
  close() {
    this._socket.terminate();
  }

  // 메시지 전송 (Protocol Encode 사용)
  send(uuid: string, msg: TSdServiceServerMessage) {
    return this.#send(uuid, msg);
  }
  #send(uuid: string, msg: TSdServiceServerRawMessage) {
    if (this._socket.readyState !== WebSocket.OPEN) return 0;

    const chunks = this.#protocol.encode(uuid, msg);
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
    return targets.map(item => item.key)
    /*this.send(Uuid.new().toString(), {
      name: "evt:on",
      body: {
        keys: targets.map((item) => item.key),
        params,
      },
    });*/
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
      const decodeResult = this.#protocol.decode(msgBuffer);
      if (decodeResult.type === "progress") {
        this.#send(decodeResult.uuid, {
          name: "progress",
          body: {
            totalSize: decodeResult.totalSize,
            completedSize: decodeResult.completedSize,
          },
        });
      } else {
        const msg = decodeResult.message as TSdServiceClientRawMessage;
        if (msg.name === "ping") {
          this.#send(decodeResult.uuid, { name: "response" });
        } else {
          this.emit("message", decodeResult.uuid, msg);
        }
      }
    } catch (err) {
      this.#logger.error("WebSocket 메시지 처리 중 오류 발생", err);
    }
  }
}
