/* eslint-disable no-console */

import { Uuid, Wait } from "@simplysm/sd-core-common";
import { EventEmitter } from "events";

export class SdSocketProvider extends EventEmitter {
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
  private _heartbeatTimer?: NodeJS.Timeout;
  private _lastHeartbeatTime = Date.now();

  // 이벤트
  override on(event: "message", listener: (data: Buffer) => void): this;
  override on(
    event: "state",
    listener: (state: "connected" | "closed" | "reconnecting") => void,
  ): this;
  override on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

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

  async connectAsync(): Promise<void> {
    if (this.connected) return;
    this._isManualClose = false;

    try {
      await this._createSocketAsync();
      this._startHeartbeat();
      this._reconnectCount = 0; // 연결 성공 시 카운트 초기화
      this.emit("state", "connected");
    } catch (err) {
      // 최초 연결 실패는 에러를 던짐 (호출자가 알 수 있게)
      throw err;
    }
  }

  async closeAsync() {
    this._isManualClose = true;
    this._stopHeartbeat();
    if (this._ws) {
      this._ws.close();
      // 완전히 닫힐 때까지 대기 (Graceful Shutdown)
      await Wait.until(() => this._ws!.readyState === WebSocket.CLOSED, 100, 3000).catch(() => {});
    }
    this.emit("state", "closed");
  }

  async sendAsync(data: Buffer | Uint8Array) {
    try {
      await Wait.until(() => this.connected, undefined, 5000);
    } catch {
      throw new Error("서버와 연결되어있지 않습니다. 인터넷 연결을 확인하세요.");
    }
    this._ws!.send(data);
  }

  private async _createSocketAsync(): Promise<void> {
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

      ws.onerror = (event: any) => {
        // 연결 중 에러 발생 시 reject
        if (!this.connected) {
          const msg = event.message ?? event.error?.message ?? "Unknown WebSocket Error";
          reject(new Error(msg));
        }
      };
    });

    this._ws!.onmessage = (event) => {
      this._lastHeartbeatTime = Date.now(); // 하트비트 갱신

      const data = event.data;
      // Raw Ping/Pong 처리 (가장 먼저 체크)
      // ArrayBuffer나 Buffer의 길이가 1이고, 첫 바이트가 0x02(Pong)이면 무시
      // (하트비트 타임스탬프만 갱신하고 끝냄)
      let byteLength = 0;
      let firstByte = 0;

      if (data instanceof ArrayBuffer) {
        byteLength = data.byteLength;
        if (byteLength === 1) firstByte = new Uint8Array(data)[0];
      } else if (Buffer.isBuffer(data)) {
        byteLength = data.length;
        if (byteLength === 1) firstByte = data[0];
      }

      // 1바이트 Pong 패킷이면 여기서 종료 (Event Emit 안 함)
      if (byteLength === 1 && firstByte === 0x02) return;

      // Buffer 포맷 통일 (Browser/Node 호환)
      let buffer: Buffer;
      if (Buffer.isBuffer(data)) buffer = data;
      else if (data instanceof ArrayBuffer) buffer = Buffer.from(data);
      else if (Array.isArray(data)) buffer = Buffer.concat(data);
      else buffer = Buffer.from(data);

      this.emit("message", buffer);
    };

    this._ws!.onclose = async () => {
      this._stopHeartbeat();
      if (!this._isManualClose) {
        await this._tryReconnectAsync();
      }
    };
  }

  private async _tryReconnectAsync() {
    if (this._reconnectCount >= this._maxReconnectCount) {
      console.error("재연결 시도 횟수 초과. 연결을 포기합니다.");
      this.emit("state", "closed");
      return;
    }

    this._reconnectCount++;
    this.emit("state", "reconnecting");
    console.warn(
      `WebSocket 연결 끊김. 재연결 시도... (${this._reconnectCount}/${this._maxReconnectCount})`,
    );

    await Wait.time(this._RECONNECT_DELAY);

    try {
      await this._createSocketAsync();
      this._startHeartbeat();
      this._reconnectCount = 0;
      this.emit("state", "connected"); // 재연결 성공 알림
      console.log("WebSocket 재연결 성공");
    } catch {
      await this._tryReconnectAsync(); // 실패 시 재귀 호출
    }
  }

  private _startHeartbeat() {
    this._stopHeartbeat();
    this._lastHeartbeatTime = Date.now();

    this._heartbeatTimer = setInterval(() => {
      // 타임아웃 체크
      if (Date.now() - this._lastHeartbeatTime > this._HEARTBEAT_TIMEOUT) {
        console.warn("Heartbeat Timeout. Connection lost.");

        // 타임아웃이 발생했으므로 즉시 타이머를 멈춰서 반복 실행을 막습니다.
        this._stopHeartbeat();

        // 소켓이 닫히기를 기다리지 말고(onclose 미발생 대비), 강제로 정리 후 재연결합니다.
        if (this._ws) {
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
          } catch {}

          // 수동 종료가 아니라면 재연결 로직 강제 실행
          if (!this._isManualClose) {
            void this._tryReconnectAsync();
          }
        }
        return;
      }

      // ping  전송
      if (this.connected) {
        try {
          this._ws!.send(this._PING_PACKET);
        } catch (err) {
          console.warn("Ping send failed", err);
        }
      }
    }, this._HEARTBEAT_INTERVAL);
  }

  private _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = undefined;
    }
  }
}
