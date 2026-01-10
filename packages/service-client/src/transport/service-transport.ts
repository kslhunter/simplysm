import type {
  ServiceErrorMessage,
  ServiceResponseMessage,
  ServiceClientMessage,
} from "@simplysm/service-common";
import type { ServiceProgress } from "../types/progress.types";

import type { SocketProvider } from "./socket-provider";
import { EventEmitter } from "events";
import { ClientProtocolWrapper } from "../protocol/client-protocol-wrapper";
import { Uuid } from "@simplysm/core-common";

export class ServiceTransport extends EventEmitter {
  private readonly _protocol = new ClientProtocolWrapper();

  private readonly _listenerMap = new Map<
    string,
    {
      resolve: (msg: ServiceResponseMessage) => void;
      reject: (err: Error) => void;
      progress?: ServiceProgress;
    }
  >();

  // 이벤트
  override on(event: "reload", listener: (changedFileSet: Set<string>) => void): this;
  override on(event: "event", listener: (keys: string[], data: unknown) => void): this;
  override on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  constructor(private readonly _socket: SocketProvider) {
    super();

    this._socket.on("message", this._onMessage.bind(this));

    // 소켓이 끊기면 대기 중인 모든 요청을 에러 처리하여 메모리 해제
    this._socket.on("state", (state) => {
      if (state === "closed" || state === "reconnecting") {
        this._cancelAllRequests("Socket connection lost");
      }
    });
  }

  async sendAsync(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown> {
    const uuid = Uuid.new().toString();

    // 응답 대기 시작 (요청 보내기 전에 리스너를 먼저 등록해야 안전함)
    const responsePromise = new Promise((resolve, reject) => {
      this._listenerMap.set(uuid, { resolve, reject, progress });
    });

    // 요청 전송
    try {
      const { chunks, totalSize } = await this._protocol.encodeAsync(uuid, message);

      // 진행률 초기화
      if (chunks.length > 1) {
        progress?.request?.({
          uuid,
          totalSize,
          completedSize: 0,
        });
      }

      // 전송
      for (const chunk of chunks) {
        await this._socket.sendAsync(chunk);
      }
    } catch (err) {
      // 전송 실패 시 즉시 정리
      this._listenerMap.get(uuid)?.reject(err as Error);
      this._listenerMap.delete(uuid);
      throw err;
    }

    // 응답 결과 반환
    return await responsePromise;
  }

  private async _onMessage(buf: Buffer): Promise<void> {
    const decoded = await this._protocol.decodeAsync(buf);

    const listenerInfo = this._listenerMap.get(decoded.uuid);

    try {
      if (decoded.type === "progress") {
        listenerInfo?.progress?.response?.({
          uuid: decoded.uuid,
          totalSize: decoded.totalSize,
          completedSize: decoded.completedSize,
        });
      } else {
        if (decoded.message.name === "progress") {
          const body = decoded.message.body as { totalSize: number; completedSize: number };
          listenerInfo?.progress?.request?.({
            uuid: decoded.uuid,
            totalSize: body.totalSize,
            completedSize: body.completedSize,
          });
        } else if (decoded.message.name === "response") {
          // 응답을 받았으므로 Map에서 제거
          this._listenerMap.delete(decoded.uuid);

          listenerInfo?.resolve(decoded.message.body as ServiceResponseMessage);
        } else if (decoded.message.name === "error") {
          // 에러를 받았으므로 Map에서 제거
          this._listenerMap.delete(decoded.uuid);

          listenerInfo?.reject(this._toError(decoded.message.body));
        } else if (decoded.message.name === "reload") {
          const body = decoded.message.body as { clientName: string; changedFileSet: Set<string> };
          if (this._socket.clientName === body.clientName) {
            this.emit("reload", body.changedFileSet);
          }
        } else if (decoded.message.name === "evt:on") {
          const body = decoded.message.body as { keys: string[]; data: unknown };
          this.emit("event", body.keys, body.data);
        } else {
          throw new Error("요청이 잘 못 되었습니다.");
        }
      }
    } catch (err) {
      listenerInfo?.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // 모든 대기 요청 취소 처리
  private _cancelAllRequests(reason: string): void {
    for (const listenerInfo of this._listenerMap.values()) {
      listenerInfo.reject(new Error(`Request canceled: ${reason}`));
    }
    this._listenerMap.clear();
  }

  private _toError(body: ServiceErrorMessage["body"]): Error {
    let err = new Error(body.message);
    err = Object.assign(err, body);
    return err;
  }
}
