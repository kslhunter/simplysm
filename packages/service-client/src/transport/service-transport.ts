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
  reload: Set<string>;
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

  // Store response progress totalSize (for emitting 100% on complete)
  const responseProgressTotalSize = new Map<string, number>();

  socket.on("message", onMessage);

  // When socket disconnects, reject all pending requests to free memory
  socket.on("state", (state) => {
    if (state === "closed" || state === "reconnecting") {
      cancelAllRequests("Socket connection lost");
    }
  });

  async function send(message: ServiceClientMessage, progress?: ServiceProgress): Promise<unknown> {
    const uuid = Uuid.new().toString();

    // Start awaiting response (register listener before sending request for safety)
    const responsePromise = new Promise((resolve, reject) => {
      pendingRequests.set(uuid, { resolve, reject, progress });
    });

    // Send request
    try {
      const { chunks, totalSize } = await protocol.encode(uuid, message);

      // Initialize progress
      if (chunks.length > 1) {
        progress?.request?.({
          uuid,
          totalSize,
          completedSize: 0,
        });
      }

      // Send
      for (const chunk of chunks) {
        await socket.send(chunk);
      }
    } catch (err) {
      // Clean up immediately on send failure
      pendingRequests.get(uuid)?.reject(err as Error);
      pendingRequests.delete(uuid);
      throw err;
    }

    // Return response result
    return responsePromise;
  }

  async function onMessage(buf: Bytes): Promise<void> {
    const decoded = await protocol.decode(buf);

    const listenerInfo = pendingRequests.get(decoded.uuid);

    try {
      if (decoded.type === "progress") {
        // Remember totalSize (for emitting 100% on complete)
        responseProgressTotalSize.set(decoded.uuid, decoded.totalSize);

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
          // Emit 100% progress if it was a split message
          const totalSize = responseProgressTotalSize.get(decoded.uuid);
          if (totalSize != null) {
            responseProgressTotalSize.delete(decoded.uuid);
            listenerInfo?.progress?.response?.({
              uuid: decoded.uuid,
              totalSize,
              completedSize: totalSize,
            });
          }

          // Remove from Map since response received
          pendingRequests.delete(decoded.uuid);

          listenerInfo?.resolve(decoded.message.body as ServiceResponseMessage);
        } else if (decoded.message.name === "error") {
          // Clean up progress totalSize
          responseProgressTotalSize.delete(decoded.uuid);

          // Remove from Map since error received
          pendingRequests.delete(decoded.uuid);

          listenerInfo?.reject(toError(decoded.message.body));
        } else if (decoded.message.name === "reload") {
          const body = decoded.message.body as { clientName: string; changedFileSet: Set<string> };
          if (socket.clientName === body.clientName) {
            emitter.emit("reload", body.changedFileSet);
          }
        } else if (decoded.message.name === "evt:on") {
          const body = decoded.message.body as { keys: string[]; data: unknown };
          emitter.emit("event", { keys: body.keys, data: body.data });
        } else {
          throw new Error("요청이 잘 못 되었습니다.");
        }
      }
    } catch (err) {
      listenerInfo?.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // Cancel all pending requests
  function cancelAllRequests(reason: string): void {
    for (const listenerInfo of pendingRequests.values()) {
      listenerInfo.reject(new Error(`Request canceled: ${reason}`));
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
