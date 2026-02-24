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
  // Configuration constants
  const HEARTBEAT_TIMEOUT = 30000; // Consider disconnected if no message for 30s
  const HEARTBEAT_INTERVAL = 5000; // Send ping every 5s
  const RECONNECT_DELAY = 3000; // Retry reconnect every 3s

  // Pre-allocate 1-byte buffer (saves memory)
  const PING_PACKET = new Uint8Array([0x01]);

  // State
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
      reconnectCount = 0; // Reset count on successful connection
      emitter.emit("state", "connected");
    } catch (err) {
      // Throw on initial connection failure (so the caller can handle it)
      throw err;
    }
  }

  async function close(): Promise<void> {
    isManualClose = true;
    stopHeartbeat();
    const currentWs = ws;
    if (currentWs != null) {
      currentWs.close();
      // Wait until fully closed (graceful shutdown)
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
        // Reject on error during connection
        if (!isConnected()) {
          const errorEvent = event as ErrorEvent;
          const msg = errorEvent.message;
          reject(new Error(msg));
        }
      };
    });

    // At this point ws is always assigned (assigned in ws.onopen)
    const currentWs = ws;
    if (currentWs == null) {
      throw new Error("WebSocket initialization failed");
    }

    currentWs.onmessage = (event) => {
      lastHeartbeatTime = Date.now(); // Update heartbeat

      const data = event.data as ArrayBuffer;
      const bytes = new Uint8Array(data);

      // Raw Ping/Pong handling (checked first)
      // If 1 byte and first byte is 0x02 (Pong), ignore
      // (only heartbeat timestamp was updated, nothing else to do)
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
    // Loop-based reconnect (used instead of recursion for stack safety)
    while (reconnectCount < maxReconnectCount) {
      reconnectCount++;
      emitter.emit("state", "reconnecting");
      logger.warn("WebSocket disconnected. Attempting reconnect...", {
        reconnectCount,
        maxReconnectCount,
      });

      await waitTime(RECONNECT_DELAY);

      try {
        await createSocket();
        startHeartbeat();
        reconnectCount = 0;
        emitter.emit("state", "connected"); // Notify reconnect success
        logger.info("WebSocket reconnected successfully");
        return; // Exit on successful reconnect
      } catch {
        // Continue loop on failure
      }
    }

    // Max retry count exceeded
    logger.error("Reconnect retry limit exceeded. Giving up.");
    emitter.emit("state", "closed");
  }

  function startHeartbeat(): void {
    stopHeartbeat();
    lastHeartbeatTime = Date.now();

    heartbeatTimer = setInterval(() => {
      // Timeout check
      if (Date.now() - lastHeartbeatTime > HEARTBEAT_TIMEOUT) {
        logger.warn("Heartbeat Timeout. Connection lost.");

        // Stop the timer immediately on timeout to prevent repeated execution.
        stopHeartbeat();

        // Don't wait for socket close (onclose may not fire); force cleanup and reconnect.
        if (ws != null) {
          const tempWs = ws;
          ws = undefined; // Consider connection as disconnected

          // Remove event handlers from old socket
          // Prevent duplicate reconnect from late onclose events
          tempWs.onclose = null;
          tempWs.onerror = null;
          tempWs.onmessage = null;

          // Attempt to close socket (ignore errors)
          try {
            tempWs.close();
          } catch {
            // ignore
          }

          // Force reconnect logic if not a manual close
          if (!isManualClose) {
            void tryReconnect();
          }
        }
        return;
      }

      // Send ping
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
