import type { Bytes } from "@simplysm/core-common";
import { Worker, type WorkerProxy } from "@simplysm/core-node";
import type { ServiceMessageDecodeResult, ServiceMessage } from "@simplysm/service-common";
import { createServiceProtocol } from "@simplysm/service-common";
import type * as ServiceProtocolWorkerModule from "../workers/service-protocol.worker";

/**
 * Protocol wrapper interface
 *
 * Automatically offloads heavy message encoding/decoding to a worker thread
 * while using main thread for lightweight operations.
 */
export interface ProtocolWrapper {
  /**
   * Encode message (auto worker delegation)
   */
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;

  /**
   * Decode message (auto worker delegation)
   */
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;

  /**
   * Dispose protocol resources
   */
  dispose(): void;
}

// Shared worker instance (lazy singleton)
let sharedWorker: WorkerProxy<typeof ServiceProtocolWorkerModule> | undefined;

function getWorker(): WorkerProxy<typeof ServiceProtocolWorkerModule> {
  if (sharedWorker == null) {
    sharedWorker = Worker.create<typeof ServiceProtocolWorkerModule>(
      import.meta.resolve("../workers/service-protocol.worker"),
      {
        resourceLimits: { maxOldGenerationSizeMb: 4096 },
      },
    );
  }
  return sharedWorker;
}

/**
 * Create a protocol wrapper instance
 *
 * Automatically offloads heavy message encoding/decoding to a worker thread
 * while using main thread for lightweight operations.
 */
export function createProtocolWrapper(): ProtocolWrapper {
  // -------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------

  const protocol = createServiceProtocol();
  const SIZE_THRESHOLD = 30 * 1024; // 30KB

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  /**
   * Check if message should use worker for encoding
   */
  function shouldUseWorkerForEncode(msg: ServiceMessage): boolean {
    if (!("body" in msg)) return false;

    const body = msg.body;

    // Uint8Array: always use worker
    if (body instanceof Uint8Array) {
      return true;
    }

    // Array: check for Uint8Array elements (ORM results, etc.)
    if (Array.isArray(body)) {
      return body.length > 0 && body.some((item) => item instanceof Uint8Array);
    }

    return false;
  }

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  return {
    async encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }> {
      if (shouldUseWorkerForEncode(message)) {
        return getWorker().encode(uuid, message);
      } else {
        return protocol.encode(uuid, message);
      }
    },

    async decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>> {
      const totalSize = bytes.length;
      if (totalSize > SIZE_THRESHOLD) {
        return getWorker().decode(bytes);
      } else {
        return protocol.decode(bytes);
      }
    },

    dispose(): void {
      protocol.dispose();
    },
  };
}
