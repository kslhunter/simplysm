import type { Bytes } from "@simplysm/core-common";
import { EventEmitter, Uuid, waitUntil, waitTime } from "@simplysm/core-common";
import consola from "consola";

const logger = consola.withTag("service-client:SocketProvider");

interface SocketProviderEvents {
  message: Bytes;
  state: "connected" | "closed" | "reconnecting";
}

export class SocketProvider extends EventEmitter<SocketProviderEvents> {
  // 설정상수
  private readonly _HEARTBEAT_TIMEOUT = 30000; // 30초간 아무런 메시지가 없으면 끊김으로 간주
  private readonly _HEARTBEAT_INTERVAL = 5000; // 5초마다 핑 전송
  private readonly _RECONNECT_DELAY = 3000; // 3초마다 재연결 시도

  // 1바이트 버퍼 미리 생성 (메모리 절약)
  private readonly _PING_PACKET = new Uint8Array([0x01]);

  // 상태
  private _ws?: WebSocket;
  private _isManualClose = false;
  private _reconnectCount = 0;
  private _heartbeatTimer?: ReturnType<typeof setInterval>;
  private _lastHeartbeatTime = Date.now();

  get connected(): boolean {
    return this._ws?.readyState === WebSocket.OPEN;
  }

  constructor(
    private readonly _url: string,
    public readonly clientName: string,
    private readonly _maxReconnectCount: number,
  ) {
    super();
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    this._isManualClose = false;

    try {
      await this._createSocket();
      this._startHeartbeat();
      this._reconnectCount = 0; // 연결 성공 시 카운트 초기화
      this.emit("state", "connected");
    } catch (err) {
      // 최초 연결 실패는 에러를 던짐 (호출자가 알 수 있게)
      throw err;
    }
  }

  async close(): Promise<void> {
    this._isManualClose = true;
    this._stopHeartbeat();
    const ws = this._ws;
    if (ws != null) {
      ws.close();
      // 완전히 닫힐 때까지 대기 (Graceful Shutdown)
      await waitUntil(() => ws.readyState === WebSocket.CLOSED, 100, 30).catch(() => {});
    }
    this.emit("state", "closed");
  }

  async send(data: Bytes): Promise<void> {
    try {
      await waitUntil(() => this.connected, undefined, 50);
    } catch {
      throw new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요.");
    }
    const ws = this._ws;
    if (ws == null) {
      throw new Error("WebSocket이 연결되어있지 않습니다.");
    }
    ws.send(data);
  }

  private async _createSocket(): Promise<void> {
    const clientId = Uuid.new().toString();
    const params = new URLSearchParams({
      ver: "2",
      clientId,
      clientName: this.clientName,
    });

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${this._url}?${params.toString()}`);
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        this._ws = ws;
        resolve();
      };

      ws.onerror = (event: Event) => {
        // 연결 중 에러 발생 시 reject
        if (!this.connected) {
          const errorEvent = event as ErrorEvent;
          const msg = errorEvent.message;
          reject(new Error(msg));
        }
      };
    });

    // 이 시점에서 this._ws는 항상 할당되어 있음 (ws.onopen에서 할당)
    const currentWs = this._ws;
    if (currentWs == null) {
      throw new Error("WebSocket 초기화 실패");
    }

    currentWs.onmessage = (event) => {
      this._lastHeartbeatTime = Date.now(); // 하트비트 갱신

      const data = event.data as ArrayBuffer;
      const bytes = new Uint8Array(data);

      // Raw Ping/Pong 처리 (가장 먼저 체크)
      // 1바이트이고 첫 바이트가 0x02(Pong)이면 무시
      // (하트비트 타임스탬프만 갱신하고 끝냄)
      if (bytes.length === 1 && bytes[0] === 0x02) return;

      this.emit("message", bytes);
    };

    currentWs.onclose = async () => {
      this._stopHeartbeat();
      if (!this._isManualClose) {
        await this._tryReconnect();
      }
    };
  }

  private async _tryReconnect(): Promise<void> {
    // 루프 기반 재연결 (재귀 대신 사용하여 스택 안전성 확보)
    while (this._reconnectCount < this._maxReconnectCount) {
      this._reconnectCount++;
      this.emit("state", "reconnecting");
      logger.warn("WebSocket 연결 끊김. 재연결 시도...", {
        reconnectCount: this._reconnectCount,
        maxReconnectCount: this._maxReconnectCount,
      });

      await waitTime(this._RECONNECT_DELAY);

      try {
        await this._createSocket();
        this._startHeartbeat();
        this._reconnectCount = 0;
        this.emit("state", "connected"); // 재연결 성공 알림
        logger.info("WebSocket 재연결 성공");
        return; // 재연결 성공 시 종료
      } catch {
        // 실패 시 루프 계속
      }
    }

    // 최대 재시도 횟수 초과
    logger.error("재연결 시도 횟수 초과. 연결을 포기합니다.");
    this.emit("state", "closed");
  }

  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this._lastHeartbeatTime = Date.now();

    this._heartbeatTimer = setInterval(() => {
      // 타임아웃 체크
      if (Date.now() - this._lastHeartbeatTime > this._HEARTBEAT_TIMEOUT) {
        logger.warn("Heartbeat Timeout. Connection lost.");

        // 타임아웃이 발생했으므로 즉시 타이머를 멈춰서 반복 실행을 막습니다.
        this._stopHeartbeat();

        // 소켓이 닫히기를 기다리지 말고(onclose 미발생 대비), 강제로 정리 후 재연결합니다.
        if (this._ws != null) {
          const tempWs = this._ws;
          this._ws = undefined; // 연결 상태 끊김으로 간주

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
          if (!this._isManualClose) {
            void this._tryReconnect();
          }
        }
        return;
      }

      // ping 전송
      const ws = this._ws;
      if (this.connected && ws != null) {
        try {
          ws.send(this._PING_PACKET);
        } catch (err) {
          logger.warn("Ping send failed", err);
        }
      }
    }, this._HEARTBEAT_INTERVAL);
  }

  private _stopHeartbeat(): void {
    if (this._heartbeatTimer != null) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = undefined;
    }
  }
}
