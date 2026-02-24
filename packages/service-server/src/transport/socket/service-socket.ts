import type { Bytes } from "@simplysm/core-common";
import { DateTime } from "@simplysm/core-common";
import type { FastifyRequest } from "fastify";
import { clearInterval } from "node:timers";
import consola from "consola";
import { WebSocket } from "ws";
import type { AuthTokenPayload } from "../../auth/auth-token-payload";
import { createProtocolWrapper } from "../../protocol/protocol-wrapper";
import type {
  ServiceClientMessage,
  ServiceServerMessage,
  ServiceServerRawMessage,
} from "@simplysm/service-common";

const logger = consola.withTag("service-server:ServiceSocket");

/**
 * Service socket interface
 *
 * Manages a single WebSocket connection with protocol encoding/decoding,
 * ping/pong keep-alive, and event listener tracking.
 */
export interface ServiceSocket {
  readonly connectedAtDateTime: DateTime;
  readonly clientName: string;
  readonly connReq: FastifyRequest;
  authTokenPayload?: AuthTokenPayload;

  /**
   * Close the WebSocket connection
   */
  close(): void;

  /**
   * Send a message to the client
   */
  send(uuid: string, msg: ServiceServerMessage): Promise<number>;

  /**
   * Register an event listener with key/name/info
   */
  addEventListener(key: string, eventName: string, info: unknown): void;

  /**
   * Remove an event listener by key
   */
  removeEventListener(key: string): void;

  /**
   * Get all event listeners for a specific event name
   */
  getEventListeners(eventName: string): Array<{ key: string; info: unknown }>;

  /**
   * Filter target keys that exist in this socket's listeners
   */
  filterEventTargetKeys(targetKeys: string[]): string[];

  /**
   * Register event handlers
   */
  on(event: "error", handler: (err: Error) => void): void;
  on(event: "close", handler: (code: number) => void): void;
  on(event: "message", handler: (data: { uuid: string; msg: ServiceClientMessage }) => void): void;
}

/**
 * Create a service socket instance
 *
 * Manages a single WebSocket connection with protocol encoding/decoding,
 * ping/pong keep-alive, and event listener tracking.
 */
export function createServiceSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): ServiceSocket {
  // -------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------

  const PING_INTERVAL = 5000; // Send ping every 5s
  const PONG_PACKET = new Uint8Array([0x02]);

  const protocol = createProtocolWrapper();
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
  // Helpers
  // -------------------------------------------------------------------

  async function sendInternal(uuid: string, msg: ServiceServerRawMessage): Promise<number> {
    if (socket.readyState !== WebSocket.OPEN) return 0;

    const { chunks } = await protocol.encode(uuid, msg);
    for (const chunk of chunks) {
      socket.send(chunk);
    }

    return chunks.reduce((acc, item) => acc + item.length, 0);
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
  // Event Handlers
  // -------------------------------------------------------------------

  function onError(err: Error): void {
    logger.error("WebSocket client error", err);
    emitEvent("error", err);
  }

  function onClose(code: number): void {
    clearInterval(pingTimer);
    protocol.dispose();
    emitEvent("close", code);
  }

  async function onMessage(msgBuffer: Bytes): Promise<void> {
    try {
      // Handle pong response to ping
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
      logger.error("Error processing WebSocket message", err);
    }
  }

  // -------------------------------------------------------------------
  // Setup
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
  // Public API
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

    addEventListener(key: string, eventName: string, info: unknown): void {
      listenerInfos.push({ key, eventName, info });
    },

    removeEventListener(key: string): void {
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
