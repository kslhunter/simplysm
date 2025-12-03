import {
  ISdServiceErrorMessage,
  ISdServiceResponseMessage,
  SdServiceProtocol,
  TSdServiceClientRawMessage,
} from "@simplysm/sd-service-common";
import { SdWebSocketWrapper } from "./SdWebSocketWrapper";
import { ISdServiceProgress } from "../types/progress.types";

export class SdServiceTransport {
  readonly #protocol = new SdServiceProtocol();

  readonly #listenerMap = new Map<
    string,
    {
      resolve: (msg: ISdServiceResponseMessage) => void;
      reject: (err: Error) => void;
      progress?: ISdServiceProgress;
    }
  >();

  constructor(private readonly _ws: SdWebSocketWrapper) {
    this._ws.on("message", this.#onMessage.bind(this));

    // 소켓이 끊기면 대기 중인 모든 요청을 에러 처리하여 메모리 해제
    this._ws.on("close", () => {
      this.#cancelAllRequests("Socket disconnected");
    });
  }

  async sendAsync(
    uuid: string,
    message: TSdServiceClientRawMessage,
    progress?: ISdServiceProgress,
  ): Promise<any> {
    // 응답 대기 시작 (요청 보내기 전에 리스너를 먼저 등록해야 안전함)
    const responsePromise = new Promise((resolve, reject) => {
      this.#listenerMap.set(uuid, {
        resolve,
        reject,
        progress,
      });
    });

    // 요청 전송
    try {
      const chunks = this.#protocol.encode(uuid, message);

      if (chunks.length > 1) {
        progress?.request?.({
          uuid: uuid,
          totalSize: chunks.sum((chunk) => chunk.length),
          completedSize: 0,
        });
      }

      for (const chunk of chunks) {
        await this._ws.sendAsync(chunk);
      }
    } catch (err) {
      // 전송 실패 시 즉시 정리
      this.#listenerMap.get(uuid)?.reject(err as Error);
      this.#listenerMap.delete(uuid);
      throw err;
    }

    // 응답 결과 반환
    return await responsePromise;
  }

  // 모든 대기 요청 취소 처리
  #cancelAllRequests(reason: string) {
    for (const listenerInfo of this.#listenerMap.values()) {
      listenerInfo.reject(new Error(`Request canceled: ${reason}`));
    }
    this.#listenerMap.clear();
  }

  #onMessage(buf: Buffer) {
    const decoded = this.#protocol.decode(buf);

    const listenerInfo = this.#listenerMap.get(decoded.uuid);

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
          this.#listenerMap.delete(decoded.uuid);

          listenerInfo?.resolve(decoded.message.body);
        } else if (decoded.message.name === "error") {
          listenerInfo?.reject(this.#toError(decoded.message.body));
        }
      }
    } catch (err) {
      listenerInfo?.reject(err);
    }
  }

  #toError(body: ISdServiceErrorMessage["body"]): Error {
    const err = new Error(body.message);
    (err as any).code = body.code;
    if (body.stack != null) err.stack = body.stack;
    if (body.detail != null) err["detail"] = body.detail;
    return err;
  }
}
