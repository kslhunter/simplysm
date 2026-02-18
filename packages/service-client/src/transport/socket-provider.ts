import type { Bytes } from "@simplysm/core-common";
import { EventEmitter, Uuid, waitUntil, waitTime } from "@simplysm/core-common";
import consola from "consola";

const logger = consola.withTag("service-client:SocketProvider");

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
  // 설정상수
  const HEARTBEAT_TIMEOUT = 30000; // 30초간 아무런 메시지가 없으면 끊김으로 간주
  const HEARTBEAT_INTERVAL = 5000; // 5초마다 핑 전송
  const RECONNECT_DELAY = 3000; // 3초마다 재연결 시도

  // 1바이트 버퍼 미리 생성 (메모리 절약)
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
      // 최초 연결 실패는 에러를 던짐 (호출자가 알 수 있게)
      throw err;
    }
  }

  async function close(): Promise<void> {
    isManualClose = true;
    stopHeartbeat();
    const currentWs = ws;
    if (currentWs != null) {
      currentWs.close();
      // 완전히 닫힐 때까지 대기 (Graceful Shutdown)
      await waitUntil(() => currentWs.readyState === WebSocket.CLOSED, 100, 30).catch(() => {});
    }
    emitter.emit("state", "closed");
  }

  async function send(data: Bytes): Promise<void> {
    try {
      await waitUntil(() => isConnected(), undefined, 50);
    } catch {
      throw new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요.");
    }
    const currentWs = ws;
    if (currentWs == null) {
      throw new Error("WebSocket이 연결되어있지 않습니다.");
    }
    currentWs.send(data);
  }

  async function createSocket(): Promise<void> {
    const clientId = Uuid.new().toString();
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
          const errorEvent = event as ErrorEvent;
          const msg = errorEvent.message;
          reject(new Error(msg));
        }
      };
    });

    // 이 시점에서 ws는 항상 할당되어 있음 (ws.onopen에서 할당)
    const currentWs = ws;
    if (currentWs == null) {
      throw new Error("WebSocket 초기화 실패");
    }

    currentWs.onmessage = (event) => {
      lastHeartbeatTime = Date.now(); // 하트비트 갱신

      const data = event.data as ArrayBuffer;
      const bytes = new Uint8Array(data);

      // Raw Ping/Pong 처리 (가장 먼저 체크)
      // 1바이트이고 첫 바이트가 0x02(Pong)이면 무시
      // (하트비트 타임스탬프만 갱신하고 끝냄)
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
    // 루프 기반 재연결 (재귀 대신 사용하여 스택 안전성 확보)
    while (reconnectCount < maxReconnectCount) {
      reconnectCount++;
      emitter.emit("state", "reconnecting");
      logger.warn("WebSocket 연결 끊김. 재연결 시도...", {
        reconnectCount,
        maxReconnectCount,
      });

      await waitTime(RECONNECT_DELAY);

      try {
        await createSocket();
        startHeartbeat();
        reconnectCount = 0;
        emitter.emit("state", "connected"); // 재연결 성공 알림
        logger.info("WebSocket 재연결 성공");
        return; // 재연결 성공 시 종료
      } catch {
        // 실패 시 루프 계속
      }
    }

    // 최대 재시도 횟수 초과
    logger.error("재연결 시도 횟수 초과. 연결을 포기합니다.");
    emitter.emit("state", "closed");
  }

  function startHeartbeat(): void {
    stopHeartbeat();
    lastHeartbeatTime = Date.now();

    heartbeatTimer = setInterval(() => {
      // 타임아웃 체크
      if (Date.now() - lastHeartbeatTime > HEARTBEAT_TIMEOUT) {
        logger.warn("Heartbeat Timeout. Connection lost.");

        // 타임아웃이 발생했으므로 즉시 타이머를 멈춰서 반복 실행을 막습니다.
        stopHeartbeat();

        // 소켓이 닫히기를 기다리지 말고(onclose 미발생 대비), 강제로 정리 후 재연결합니다.
        if (ws != null) {
          const tempWs = ws;
          ws = undefined; // 연결 상태 끊김으로 간주

          // 기존 소켓의 이벤트 핸들러 제거
          // 뒤늦게 발생한 onclose에 따른 중복 재연결 방지
          tempWs.onclose = null;
          tempWs.onerror = null;
          tempWs.onmessage = null;

          // 소켓 닫기 시도 (에러 무시)
          try {
            tempWs.close();
          } catch {
            // ignore
          }

          // 수동 종료가 아니라면 재연결 로직 강제 실행
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
          logger.warn("Ping send failed", err);
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
