import type { Bytes } from "@simplysm/core-common";
import { EventEmitter, Uuid, wait } from "@simplysm/core-common";
import { createLogger } from "@simplysm/core-common";

// Node.js 환경에서 글로벌 WebSocket이 없으면 ws 패키지로 polyfill
if (typeof globalThis.WebSocket === "undefined") {
  const { WebSocket } = await import("ws");
  globalThis.WebSocket = WebSocket as never;
}

const logger = createLogger("service-client:SocketProvider");

export interface SocketProviderEvents {
  message: Bytes;
  state: "connected" | "closed" | "reconnecting";
}

export interface SocketProvider {
  readonly clientName: string;
  readonly connected: boolean;
  on<K extends keyof SocketProviderEvents & string>(
    type: K,
    listener: (data: SocketProviderEvents[K]) => void,
  ): void;
  off<K extends keyof SocketProviderEvents & string>(
    type: K,
    listener: (data: SocketProviderEvents[K]) => void,
  ): void;
  connect(): Promise<void>;
  close(): Promise<void>;
  send(data: Bytes): Promise<void>;
}

export function createSocketProvider(
  url: string,
  clientName: string,
  maxReconnectCount: number,
): SocketProvider {
  // 설정 상수
  const HEARTBEAT_TIMEOUT = 30000; // 30초 동안 메시지가 없으면 연결 끊김으로 간주
  const HEARTBEAT_INTERVAL = 5000; // 5초마다 ping 전송
  const RECONNECT_DELAY = 3000; // 3초마다 재연결 시도

  // 1바이트 버퍼 사전 할당 (메모리 절약)
  const PING_PACKET = new Uint8Array([0x01]);

  // 상태
  let ws: WebSocket | undefined;
  let isManualClose = false;
  let reconnectCount = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let lastHeartbeatTime = Date.now();

  const emitter = new EventEmitter<SocketProviderEvents>();

  function isConnected(): boolean {
    return ws?.readyState === WebSocket.OPEN;
  }

  async function connect(): Promise<void> {
    if (isConnected()) return;
    isManualClose = false;

    try {
      await createSocket();
      startHeartbeat();
      reconnectCount = 0; // 연결 성공 시 카운트 초기화
      emitter.emit("state", "connected");
    } catch (err) {
      // 초기 연결 실패 시 예외를 던짐 (호출자가 처리할 수 있도록)
      throw err;
    }
  }

  async function close(): Promise<void> {
    isManualClose = true;
    stopHeartbeat();
    const currentWs = ws;
    if (currentWs != null) {
      currentWs.close();
      // 완전히 닫힐 때까지 대기 (정상 종료)
      await wait.until(() => currentWs.readyState === WebSocket.CLOSED, 100, 30).catch(() => {});
    }
    emitter.emit("state", "closed");
  }

  async function send(data: Bytes): Promise<void> {
    try {
      await wait.until(() => isConnected(), undefined, 50);
    } catch {
      throw new Error("서버에 연결되지 않았습니다. 인터넷 연결을 확인해 주세요.");
    }
    const currentWs = ws;
    if (currentWs == null) {
      throw new Error("WebSocket이 연결되지 않았습니다.");
    }
    // TS6: Bytes는 Uint8Array<ArrayBufferLike>로 추론되나 WebSocket.send는 ArrayBuffer 기반 BufferSource를 요구.
    // 새 Uint8Array(ArrayBuffer 기반)로 복사해 캐스팅 없이 타입·런타임 모두 안전하게 전달.
    currentWs.send(new Uint8Array(data));
  }

  async function createSocket(): Promise<void> {
    const clientId = Uuid.generate().toString();
    const params = new URLSearchParams({
      ver: "2",
      clientId,
      clientName,
    });

    await new Promise<void>((resolve, reject) => {
      const newWs = new WebSocket(`${url}?${params.toString()}`);
      newWs.binaryType = "arraybuffer";

      newWs.onopen = () => {
        ws = newWs;
        resolve();
      };

      newWs.onerror = (event: Event) => {
        // 연결 중 에러 발생 시 reject
        if (!isConnected()) {
          const msg = (event as { message?: string }).message;
          reject(new Error(msg));
        }
      };
    });

    // 이 시점에서 ws는 항상 할당됨 (ws.onopen에서 할당됨)
    const currentWs = ws;
    if (currentWs == null) {
      throw new Error("WebSocket 초기화 실패");
    }

    currentWs.onmessage = (event) => {
      lastHeartbeatTime = Date.now(); // 하트비트 갱신

      const data = event.data as ArrayBuffer;
      const bytes = new Uint8Array(data);

      // Raw Ping/Pong 처리 (먼저 확인)
      // 1바이트이고 첫 번째 바이트가 0x02 (Pong)이면 무시
      // (하트비트 타임스탬프만 갱신되었으므로 추가 작업 불필요)
      if (bytes.length === 1 && bytes[0] === 0x02) return;

      emitter.emit("message", bytes);
    };

    currentWs.onclose = async () => {
      stopHeartbeat();
      if (!isManualClose) {
        await tryReconnect();
      }
    };
  }

  async function tryReconnect(): Promise<void> {
    // 루프 기반 재연결 (스택 안전성을 위해 재귀 대신 사용)
    while (reconnectCount < maxReconnectCount) {
      reconnectCount++;
      emitter.emit("state", "reconnecting");
      logger.warn("WebSocket 연결 끊김. 재연결 시도 중...", {
        reconnectCount,
        maxReconnectCount,
      });

      await wait.time(RECONNECT_DELAY);

      try {
        await createSocket();
        startHeartbeat();
        reconnectCount = 0;
        emitter.emit("state", "connected"); // 재연결 성공 알림
        logger.info("WebSocket 재연결 성공");
        return; // 재연결 성공 시 루프 종료
      } catch {
        // 실패 시 루프 계속
      }
    }

    // 최대 재시도 횟수 초과
    logger.error("재연결 재시도 한도 초과. 연결을 포기합니다.");
    emitter.emit("state", "closed");
  }

  function startHeartbeat(): void {
    stopHeartbeat();
    lastHeartbeatTime = Date.now();

    heartbeatTimer = setInterval(() => {
      // 타임아웃 확인
      if (Date.now() - lastHeartbeatTime > HEARTBEAT_TIMEOUT) {
        logger.warn("하트비트 타임아웃. 연결이 끊어졌습니다.");

        // 반복 실행 방지를 위해 타임아웃 시 즉시 타이머 중지
        stopHeartbeat();

        // 소켓 종료를 기다리지 않음 (onclose가 발생하지 않을 수 있음); 강제 정리 후 재연결
        if (ws != null) {
          const tempWs = ws;
          ws = undefined; // 연결 끊김으로 간주

          // 이전 소켓에서 이벤트 핸들러 제거
          // 늦게 발생하는 onclose 이벤트로 인한 중복 재연결 방지
          tempWs.onclose = null;
          tempWs.onerror = null;
          tempWs.onmessage = null;

          // 소켓 닫기 시도 (에러 무시)
          try {
            tempWs.close();
          } catch {
            // 무시
          }

          // 수동 종료가 아닌 경우 강제 재연결 로직 실행
          if (!isManualClose) {
            void tryReconnect();
          }
        }
        return;
      }

      // ping 전송
      const currentWs = ws;
      if (isConnected() && currentWs != null) {
        try {
          currentWs.send(PING_PACKET);
        } catch (err) {
          logger.warn("ping 전송 실패", err);
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  function stopHeartbeat(): void {
    if (heartbeatTimer != null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
  }

  return {
    clientName,
    get connected() {
      return isConnected();
    },
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    connect,
    close,
    send,
  };
}
