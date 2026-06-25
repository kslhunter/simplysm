import type { Bytes } from "@simplysm/core-common";
import { DateTime } from "@simplysm/core-common";
import type { FastifyRequest } from "fastify";
import { clearInterval } from "node:timers";
import { createLogger } from "@simplysm/core-common";
import { WebSocket } from "ws";
import type { AuthTokenPayload } from "../../auth/auth-token-payload";
import { createServerProtocolWrapper } from "../../protocol/protocol-wrapper";
import type {
  ServiceClientMessage,
  ServiceServerMessage,
  ServiceServerRawMessage,
} from "@simplysm/service-common";

const logger = createLogger("service-server:ServiceSocket");

/**
 * 서비스 소켓 인터페이스
 *
 * 프로토콜 인코딩/디코딩, ping/pong 연결 유지,
 * 이벤트 리스너 추적이 포함된 단일 WebSocket 연결을 관리한다.
 */
export interface ServiceSocket {
  readonly connectedAtDateTime: DateTime;
  readonly clientName: string;
  readonly connReq: FastifyRequest;
  authTokenPayload?: AuthTokenPayload;

  /**
   * WebSocket 연결을 닫는다
   */
  close(): void;

  /**
   * 클라이언트에 메시지를 전송한다
   */
  send(uuid: string, msg: ServiceServerMessage): Promise<number>;

  /**
   * key/name/info로 이벤트 리스너를 등록한다
   */
  addListener(key: string, eventName: string, info: unknown): void;

  /**
   * key로 이벤트 리스너를 제거한다
   */
  removeListener(key: string): void;

  /**
   * 특정 이벤트 이름에 해당하는 모든 이벤트 리스너를 조회한다
   */
  getEventListeners(eventName: string): Array<{ key: string; info: unknown }>;

  /**
   * 이 소켓의 리스너에 존재하는 대상 키를 필터링한다
   */
  filterEventTargetKeys(targetKeys: string[]): string[];

  /**
   * 이벤트 핸들러를 등록한다
   */
  on(event: "error", handler: (err: Error) => void): void;
  on(event: "close", handler: (code: number) => void): void;
  on(event: "message", handler: (data: { uuid: string; msg: ServiceClientMessage }) => void): void;
}

/**
 * 서비스 소켓 인스턴스를 생성한다
 *
 * 프로토콜 인코딩/디코딩, ping/pong 연결 유지,
 * 이벤트 리스너 추적이 포함된 단일 WebSocket 연결을 관리한다.
 */
export function createServiceSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): ServiceSocket {
  // -------------------------------------------------------------------
  // 상태
  // -------------------------------------------------------------------

  const PING_INTERVAL = 5000; // 5초마다 ping 전송
  const PONG_PACKET = new Uint8Array([0x02]);

  const protocol = createServerProtocolWrapper();
  const listenerInfos: Array<{ eventName: string; key: string; info: unknown }> = [];
  const eventHandlers = {
    error: [] as Array<(err: Error) => void>,
    close: [] as Array<(code: number) => void>,
    message: [] as Array<(data: { uuid: string; msg: ServiceClientMessage }) => void>,
  };

  let isAlive = true;
  let authTokenPayload: AuthTokenPayload | undefined;

  const connectedAtDateTime = new DateTime();

  // -------------------------------------------------------------------
  // 헬퍼
  // -------------------------------------------------------------------

  async function sendInternal(uuid: string, msg: ServiceServerRawMessage): Promise<number> {
    if (socket.readyState !== WebSocket.OPEN) return 0;

    const { chunks } = await protocol.encode(uuid, msg);
    for (const chunk of chunks) {
      socket.send(chunk);
    }

    return chunks.sum((item) => item.length);
  }

  function emitEvent<K extends keyof typeof eventHandlers>(
    event: K,
    ...args: Parameters<(typeof eventHandlers)[K][number]>
  ): void {
    for (const handler of eventHandlers[event]) {
      (handler as (...args: unknown[]) => void)(...args);
    }
  }

  // -------------------------------------------------------------------
  // 이벤트 핸들러
  // -------------------------------------------------------------------

  function onError(err: Error): void {
    logger.error("WebSocket 클라이언트 에러", err);
    emitEvent("error", err);
  }

  function onClose(code: number): void {
    clearInterval(pingTimer);
    protocol.dispose();
    emitEvent("close", code);
  }

  async function onMessage(msgBuffer: Bytes): Promise<void> {
    try {
      // ping에 대한 pong 응답 처리
      if (msgBuffer.length === 1 && msgBuffer[0] === 0x01) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(PONG_PACKET);
        }
        return;
      }

      const decodeResult = await protocol.decode(msgBuffer);
      if (decodeResult.type === "progress") {
        await sendInternal(decodeResult.uuid, {
          name: "progress",
          body: {
            totalSize: decodeResult.totalSize,
            completedSize: decodeResult.completedSize,
          },
        });
      } else {
        const msg = decodeResult.message as ServiceClientMessage;
        emitEvent("message", { uuid: decodeResult.uuid, msg });
      }
    } catch (err) {
      logger.error("WebSocket 메시지 처리 중 에러 발생", err);
    }
  }

  // -------------------------------------------------------------------
  // 설정
  // -------------------------------------------------------------------

  socket.on("close", onClose);
  socket.on("error", onError);
  socket.on("message", onMessage);

  socket.on("pong", () => {
    isAlive = true;
  });

  const pingTimer = setInterval(() => {
    if (!isAlive) {
      socket.terminate();
      return;
    }

    isAlive = false;
    socket.ping();
  }, PING_INTERVAL);

  // -------------------------------------------------------------------
  // 공개 API
  // -------------------------------------------------------------------

  return {
    connectedAtDateTime,
    clientName,
    connReq,

    get authTokenPayload(): AuthTokenPayload | undefined {
      return authTokenPayload;
    },

    set authTokenPayload(value: AuthTokenPayload | undefined) {
      authTokenPayload = value;
    },

    close(): void {
      socket.terminate();
    },

    async send(uuid: string, msg: ServiceServerMessage): Promise<number> {
      return sendInternal(uuid, msg);
    },

    addListener(key: string, eventName: string, info: unknown): void {
      listenerInfos.push({ key, eventName, info });
    },

    removeListener(key: string): void {
      const idx = listenerInfos.findIndex((item) => item.key === key);
      if (idx >= 0) {
        listenerInfos.splice(idx, 1);
      }
    },

    getEventListeners(eventName: string): Array<{ key: string; info: unknown }> {
      return listenerInfos
        .filter((item) => item.eventName === eventName)
        .map((item) => ({ key: item.key, info: item.info }));
    },

    filterEventTargetKeys(targetKeys: string[]): string[] {
      return listenerInfos.filter((item) => targetKeys.includes(item.key)).map((item) => item.key);
    },

    on(event: "error" | "close" | "message", handler: (...args: any[]) => void): void {
      eventHandlers[event].push(handler as any);
    },
  };
}
