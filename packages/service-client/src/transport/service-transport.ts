import type { Bytes } from "@simplysm/core-common";
import { EventEmitter, Uuid } from "@simplysm/core-common";
import type {
  ServiceErrorMessage,
  ServiceResponseMessage,
  ServiceClientMessage,
} from "@simplysm/service-common";
import { ClientProtocolWrapper } from "../protocol/client-protocol-wrapper";
import type { ServiceProgress } from "../types/progress.types";
import type { SocketProvider } from "./socket-provider";

interface ServiceTransportEvents {
  reload: Set<string>;
  event: { keys: string[]; data: unknown };
}

export class ServiceTransport extends EventEmitter<ServiceTransportEvents> {
  private readonly _protocol = new ClientProtocolWrapper();

  private readonly _pendingRequests = new Map<
    string,
    {
      resolve: (msg: ServiceResponseMessage) => void;
      reject: (err: Error) => void;
      progress?: ServiceProgress;
    }
  >();

  // 응답 progress의 totalSize 저장 (complete 시 100% emit용)
  private readonly _responseProgressTotalSize = new Map<string, number>();

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

  async send(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown> {
    const uuid = Uuid.new().toString();

    // 응답 대기 시작 (요청 보내기 전에 리스너를 먼저 등록해야 안전함)
    const responsePromise = new Promise((resolve, reject) => {
      this._pendingRequests.set(uuid, { resolve, reject, progress });
    });

    // 요청 전송
    try {
      const { chunks, totalSize } = await this._protocol.encode(uuid, message);

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
        await this._socket.send(chunk);
      }
    } catch (err) {
      // 전송 실패 시 즉시 정리
      this._pendingRequests.get(uuid)?.reject(err as Error);
      this._pendingRequests.delete(uuid);
      throw err;
    }

    // 응답 결과 반환
    return responsePromise;
  }

  private async _onMessage(buf: Bytes): Promise<void> {
    const decoded = await this._protocol.decode(buf);

    const listenerInfo = this._pendingRequests.get(decoded.uuid);

    try {
      if (decoded.type === "progress") {
        // totalSize 기억 (complete 시 100% emit용)
        this._responseProgressTotalSize.set(decoded.uuid, decoded.totalSize);

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
          // split된 메시지였으면 100% progress emit
          const totalSize = this._responseProgressTotalSize.get(decoded.uuid);
          if (totalSize != null) {
            this._responseProgressTotalSize.delete(decoded.uuid);
            listenerInfo?.progress?.response?.({
              uuid: decoded.uuid,
              totalSize,
              completedSize: totalSize,
            });
          }

          // 응답을 받았으므로 Map에서 제거
          this._pendingRequests.delete(decoded.uuid);

          listenerInfo?.resolve(decoded.message.body as ServiceResponseMessage);
        } else if (decoded.message.name === "error") {
          // progress totalSize 정리
          this._responseProgressTotalSize.delete(decoded.uuid);

          // 에러를 받았으므로 Map에서 제거
          this._pendingRequests.delete(decoded.uuid);

          listenerInfo?.reject(this._toError(decoded.message.body));
        } else if (decoded.message.name === "reload") {
          const body = decoded.message.body as { clientName: string; changedFileSet: Set<string> };
          if (this._socket.clientName === body.clientName) {
            this.emit("reload", body.changedFileSet);
          }
        } else if (decoded.message.name === "evt:on") {
          const body = decoded.message.body as { keys: string[]; data: unknown };
          this.emit("event", { keys: body.keys, data: body.data });
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
    for (const listenerInfo of this._pendingRequests.values()) {
      listenerInfo.reject(new Error(`Request canceled: ${reason}`));
    }
    this._pendingRequests.clear();
    this._responseProgressTotalSize.clear();
  }

  private _toError(body: ServiceErrorMessage["body"]): Error {
    let err = new Error(body.message);
    err = Object.assign(err, body);
    return err;
  }
}
