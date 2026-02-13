import type { Bytes } from "@simplysm/core-common";
import { DateTime, EventEmitter } from "@simplysm/core-common";
import type { FastifyRequest } from "fastify";
import { clearInterval } from "node:timers";
import consola from "consola";
import { WebSocket } from "ws";
import type { AuthTokenPayload } from "../../auth/auth-token-payload";
import { ProtocolWrapper } from "../../protocol/protocol-wrapper";
import type { ServiceClientMessage, ServiceServerMessage, ServiceServerRawMessage } from "@simplysm/service-common";

const logger = consola.withTag("service-server:ServiceSocket");

export class ServiceSocket extends EventEmitter<{
  error: Error;
  close: number;
  message: { uuid: string; msg: ServiceClientMessage };
}> {
  private readonly _PING_INTERVAL = 5000; // 5초마다 핑 전송
  private readonly _PONG_PACKET = new Uint8Array([0x02]);

  private readonly _protocol = new ProtocolWrapper();
  private readonly _listenerInfos: { eventName: string; key: string; info: unknown }[] = [];

  private _isAlive = true;
  private readonly _pingTimer: NodeJS.Timeout;

  readonly connectedAtDateTime = new DateTime();

  authTokenPayload?: AuthTokenPayload;

  constructor(
    private readonly _socket: WebSocket,
    private readonly _clientId: string,
    public readonly clientName: string,
    public readonly connReq: FastifyRequest,
  ) {
    super();

    this._socket.on("close", this._onClose.bind(this));
    this._socket.on("error", this._onError.bind(this));
    this._socket.on("message", this._onMessage.bind(this));

    this._socket.on("pong", () => {
      this._isAlive = true;
    });

    this._pingTimer = setInterval(() => {
      if (!this._isAlive) {
        this.close();
        return;
      }

      this._isAlive = false;
      this._socket.ping();
    }, this._PING_INTERVAL);
  }

  close() {
    this._socket.terminate();
  }

  async send(uuid: string, msg: ServiceServerMessage) {
    return this._send(uuid, msg);
  }

  private async _send(uuid: string, msg: ServiceServerRawMessage) {
    if (this._socket.readyState !== WebSocket.OPEN) return 0;

    const { chunks } = await this._protocol.encode(uuid, msg);
    for (const chunk of chunks) {
      this._socket.send(chunk);
    }

    return chunks.reduce((acc, item) => acc + item.length, 0);
  }

  addEventListener(key: string, eventName: string, info: unknown) {
    this._listenerInfos.push({ key, eventName, info });
  }

  removeEventListener(key: string) {
    const idx = this._listenerInfos.findIndex((item) => item.key === key);
    if (idx >= 0) {
      this._listenerInfos.splice(idx, 1);
    }
  }

  getEventListeners(eventName: string) {
    return this._listenerInfos
      .filter((item) => item.eventName === eventName)
      .map((item) => ({ key: item.key, info: item.info }));
  }

  filterEventTargetKeys(targetKeys: string[]) {
    return this._listenerInfos.filter((item) => targetKeys.includes(item.key)).map((item) => item.key);
  }

  private _onError(err: Error) {
    logger.error("WebSocket 클라이언트 오류 발생", err);
    this.emit("error", err);
  }

  private _onClose(code: number) {
    clearInterval(this._pingTimer);
    this._protocol.dispose();
    this.emit("close", code);
  }

  private async _onMessage(msgBuffer: Bytes) {
    try {
      // ping에 대한 pong처리
      if (msgBuffer.length === 1 && msgBuffer[0] === 0x01) {
        if (this._socket.readyState === WebSocket.OPEN) {
          this._socket.send(this._PONG_PACKET);
        }
        return;
      }

      const decodeResult = await this._protocol.decode(msgBuffer);
      if (decodeResult.type === "progress") {
        await this._send(decodeResult.uuid, {
          name: "progress",
          body: {
            totalSize: decodeResult.totalSize,
            completedSize: decodeResult.completedSize,
          },
        });
      } else {
        const msg = decodeResult.message as ServiceClientMessage;
        this.emit("message", { uuid: decodeResult.uuid, msg });
      }
    } catch (err) {
      logger.error("WebSocket 메시지 처리 중 오류 발생", err);
    }
  }
}
