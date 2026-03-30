import type { Bytes } from "@simplysm/core-common";
import { Worker, type WorkerProxy } from "@simplysm/core-node";
import type { ServiceMessageDecodeResult, ServiceMessage } from "@simplysm/service-common";
import { createServiceProtocol } from "@simplysm/service-common";
import type * as ServiceProtocolWorkerModule from "../workers/service-protocol.worker";

/**
 * 프로토콜 래퍼 인터페이스
 *
 * 무거운 메시지 인코딩/디코딩을 worker 스레드에 자동으로 위임하고,
 * 가벼운 작업은 메인 스레드에서 처리한다.
 */
export interface ServerProtocolWrapper {
  /**
   * 메시지를 인코딩한다 (worker 자동 위임)
   */
  encode(uuid: string, message: ServiceMessage): Promise<{ chunks: Bytes[]; totalSize: number }>;

  /**
   * 메시지를 디코딩한다 (worker 자동 위임)
   */
  decode(bytes: Bytes): Promise<ServiceMessageDecodeResult<ServiceMessage>>;

  /**
   * 프로토콜 리소스를 해제한다
   */
  dispose(): void;
}

// 공유 worker 인스턴스 (지연 싱글턴)
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
 * 프로토콜 래퍼 인스턴스를 생성한다
 *
 * 무거운 메시지 인코딩/디코딩을 worker 스레드에 자동으로 위임하고,
 * 가벼운 작업은 메인 스레드에서 처리한다.
 */
export function createServerProtocolWrapper(): ServerProtocolWrapper {
  // -------------------------------------------------------------------
  // 상태
  // -------------------------------------------------------------------

  const protocol = createServiceProtocol();
  const SIZE_THRESHOLD = 30 * 1024; // 30KB

  // -------------------------------------------------------------------
  // 헬퍼
  // -------------------------------------------------------------------

  /**
   * 메시지 인코딩에 worker를 사용해야 하는지 확인한다
   */
  function shouldUseWorkerForEncode(msg: ServiceMessage): boolean {
    if (!("body" in msg)) return false;

    const body = msg.body;

    // Uint8Array: 항상 worker 사용
    if (body instanceof Uint8Array) {
      return true;
    }

    // 배열: Uint8Array 요소 존재 여부 확인 (ORM 결과 등)
    if (Array.isArray(body)) {
      return body.length > 0 && body.some((item) => item instanceof Uint8Array);
    }

    return false;
  }

  // -------------------------------------------------------------------
  // 공개 API
  // -------------------------------------------------------------------

  return {
    async encode(
      uuid: string,
      message: ServiceMessage,
    ): Promise<{ chunks: Bytes[]; totalSize: number }> {
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
