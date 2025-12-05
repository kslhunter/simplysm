import {
  ISdServiceErrorMessage,
  ISdServiceResponseMessage,
  TSdServiceClientMessage,
} from "@simplysm/sd-service-common";
import { ISdServiceProgress } from "../types/progress.types";

import { SdSocketProvider } from "./SdSocketProvider";
import { EventEmitter } from "events";
import { SdServiceClientProtocolWrapper } from "../protocol/SdServiceClientProtocolWrapper";
import { Uuid } from "@simplysm/sd-core-common";

export class SdServiceTransport extends EventEmitter {
  private readonly _protocol = new SdServiceClientProtocolWrapper();

  private readonly _listenerMap = new Map<
    string,
    {
      resolve: (msg: ISdServiceResponseMessage) => void;
      reject: (err: Error) => void;
      progress?: ISdServiceProgress;
    }
  >();

  // 이벤트
  override on(event: "reload", listener: (changedFileSet: Set<string>) => void): this;
  override on(event: "event", listener: (keys: string[], data: any) => void): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  constructor(private readonly _socket: SdSocketProvider) {
    super();

    this._socket.on("message", this._onMessage.bind(this));

    // 소켓이 끊기면 대기 중인 모든 요청을 에러 처리하여 메모리 해제
    this._socket.on("state", (state) => {
      if (state === "closed" || state === "reconnecting") {
        this._cancelAllRequests("Socket connection lost");
      }
    });
  }

  async sendAsync(message: TSdServiceClientMessage, progress?: ISdServiceProgress): Promise<any> {
    const uuid = Uuid.new().toString();

    // 응답 대기 시작 (요청 보내기 전에 리스너를 먼저 등록해야 안전함)
    const responsePromise = new Promise((resolve, reject) => {
      this._listenerMap.set(uuid, { resolve, reject, progress });
    });

    // 요청 전송
    try {
      const chunks = await this._protocol.encodeAsync(uuid, message);

      // 진행률 초기화
      if (chunks.length > 1) {
        progress?.request?.({
          uuid,
          totalSize: chunks.sum((chunk) => chunk.length),
          completedSize: 0,
        });
      }

      // 전송
      for (const chunk of chunks) {
        this._socket.send(chunk);
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

  private async _onMessage(buf: Buffer) {
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
          listenerInfo?.progress?.request?.({
            uuid: decoded.uuid,
            totalSize: decoded.message.body.totalSize,
            completedSize: decoded.message.body.completedSize,
          });
        } else if (decoded.message.name === "response") {
          // 응답을 받았으므로 Map에서 제거
          this._listenerMap.delete(decoded.uuid);

          listenerInfo?.resolve(decoded.message.body);
        } else if (decoded.message.name === "error") {
          listenerInfo?.reject(this._toError(decoded.message.body));
        } else if (decoded.message.name === "reload") {
          if (this._socket.clientName === decoded.message.body.clientName) {
            this.emit("reload", decoded.message.body.changedFileSet);
          }
        } else if (decoded.message.name === "evt:on") {
          this.emit("event", decoded.message.body.keys, decoded.message.body.data);
        } else {
          throw new Error("요청이 잘 못 되었습니다.");
        }
      }
    } catch (err) {
      listenerInfo?.reject(err);
    }
  }

  // 모든 대기 요청 취소 처리
  private _cancelAllRequests(reason: string) {
    for (const listenerInfo of this._listenerMap.values()) {
      listenerInfo.reject(new Error(`Request canceled: ${reason}`));
    }
    this._listenerMap.clear();
  }

  private _toError(body: ISdServiceErrorMessage["body"]): Error {
    let err = new Error(body.message);
    err = Object.assign(err, body);
    return err;
  }
}
