import type { Bytes } from "@simplysm/core-common";
import { EventEmitter, Uuid } from "@simplysm/core-common";
import type {
  ServiceErrorMessage,
  ServiceResponseMessage,
  ServiceClientMessage,
} from "@simplysm/service-common";
import type { ClientProtocolWrapper } from "../protocol/client-protocol-wrapper";
import type { ServiceProgress } from "../types/progress.types";
import type { SocketProvider } from "./socket-provider";

export interface ServiceTransportEvents {
  event: { keys: string[]; data: unknown };
}

export interface ServiceTransport {
  on<K extends keyof ServiceTransportEvents & string>(
    type: K,
    listener: (data: ServiceTransportEvents[K]) => void,
  ): void;
  off<K extends keyof ServiceTransportEvents & string>(
    type: K,
    listener: (data: ServiceTransportEvents[K]) => void,
  ): void;
  send(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown>;
}

export function createServiceTransport(
  socket: SocketProvider,
  protocol: ClientProtocolWrapper,
): ServiceTransport {
  const emitter = new EventEmitter<ServiceTransportEvents>();

  const pendingRequests = new Map<
    string,
    {
      resolve: (msg: ServiceResponseMessage) => void;
      reject: (err: Error) => void;
      progress?: ServiceProgress;
    }
  >();

  // 응답 progress totalSize 저장 (완료 시 100% 전송용)
  const responseProgressTotalSize = new Map<string, number>();

  socket.on("message", onMessage);

  // 소켓 연결 끊김 시 메모리 해제를 위해 모든 대기 중인 요청을 reject
  socket.on("state", (state) => {
    if (state === "closed" || state === "reconnecting") {
      cancelAllRequests("소켓 연결이 끊어졌습니다");
    }
  });

  async function send(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown> {
    const uuid = Uuid.generate().toString();

    // 응답 대기 시작 (안전을 위해 요청 전송 전에 리스너 등록)
    const responsePromise = new Promise((resolve, reject) => {
      pendingRequests.set(uuid, { resolve, reject, progress });
    });

    // Promise가 고아가 되었을 때 unhandled rejection 방지 (예: 소켓 연결 끊김 시)
    responsePromise.catch(() => {});

    // 요청 전송
    try {
      const { chunks, totalSize } = await protocol.encode(uuid, message);

      // progress 초기화
      if (chunks.length > 1) {
        progress?.request?.({
          uuid,
          totalSize,
          completedSize: 0,
        });
      }

      // 전송
      for (const chunk of chunks) {
        await socket.send(chunk);
      }
    } catch (err) {
      // 전송 실패 시 즉시 정리
      pendingRequests.get(uuid)?.reject(err as Error);
      pendingRequests.delete(uuid);
      throw err;
    }

    // 응답 결과 반환
    return responsePromise;
  }

  async function onMessage(buf: Bytes): Promise<void> {
    const decoded = await protocol.decode(buf);

    const listenerInfo = pendingRequests.get(decoded.uuid);

    try {
      if (decoded.type === "progress") {
        // totalSize 기억 (완료 시 100% 전송용)
        responseProgressTotalSize.set(decoded.uuid, decoded.totalSize);

        listenerInfo?.progress?.response?.({
          uuid: decoded.uuid,
          totalSize: decoded.totalSize,
          completedSize: decoded.completedSize,
        });
      } else {
        if (decoded.message.name === "progress") {
          const body = decoded.message.body as { totalSize: number; completedSize: number };
          listenerInfo?.progress?.server?.({
            uuid: decoded.uuid,
            totalSize: body.totalSize,
            completedSize: body.completedSize,
          });
        } else if (decoded.message.name === "response") {
          // 분할 메시지였을 경우 100% progress 전송
          const totalSize = responseProgressTotalSize.get(decoded.uuid);
          if (totalSize != null) {
            responseProgressTotalSize.delete(decoded.uuid);
            listenerInfo?.progress?.response?.({
              uuid: decoded.uuid,
              totalSize,
              completedSize: totalSize,
            });
          }

          // 응답 수신으로 Map에서 제거
          pendingRequests.delete(decoded.uuid);

          listenerInfo?.resolve(decoded.message.body as ServiceResponseMessage);
        } else if (decoded.message.name === "error") {
          // progress totalSize 정리
          responseProgressTotalSize.delete(decoded.uuid);

          // 에러 수신으로 Map에서 제거
          pendingRequests.delete(decoded.uuid);

          listenerInfo?.reject(toError(decoded.message.body));
        } else if (decoded.message.name === "evt:on") {
          const body = decoded.message.body as { keys: string[]; data: unknown };
          emitter.emit("event", { keys: body.keys, data: body.data });
        } else {
          throw new Error("서버로부터 잘못된 메시지를 수신했습니다.");
        }
      }
    } catch (err) {
      listenerInfo?.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // 모든 대기 중인 요청 취소
  function cancelAllRequests(reason: string): void {
    for (const listenerInfo of pendingRequests.values()) {
      listenerInfo.reject(new Error(`요청 취소됨: ${reason}`));
    }
    pendingRequests.clear();
    responseProgressTotalSize.clear();
  }

  function toError(body: ServiceErrorMessage["body"]): Error {
    let err = new Error(body.message);
    err = Object.assign(err, body);
    return err;
  }

  return {
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    send,
  };
}
