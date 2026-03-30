import { describe, it, expect } from "vitest";
import { createClientProtocolWrapper } from "../../src/protocol/client-protocol-wrapper";
import { createServiceProtocol } from "@simplysm/service-common";

/**
 * postMessage 호환성 테스트
 *
 * Chrome 61 호환을 위해 postMessage(msg, { transfer }) 대신
 * postMessage(msg, transferList) 배열 형태를 사용해야 한다.
 *
 * Worker가 없는 환경(Node.js)에서는 fallback 경로로 메인 스레드에서 처리되므로,
 * 이 테스트는 fallback 경로의 encode/decode가 정상 동작하는지 확인한다.
 * Worker 경로의 postMessage 배열 형태는 코드 변경으로 보장한다.
 */
describe("ClientProtocolWrapper (Worker 미사용 fallback)", () => {
  it("Worker 없는 환경에서 encode/decode 라운드트립이 정상 동작한다", async () => {
    const protocol = createServiceProtocol();
    const wrapper = createClientProtocolWrapper(protocol);

    try {
      const uuid = "00000000-0000-0000-0000-000000000001";
      const message = { name: "test.method" as const, body: [{ value: 42 }] };

      const encoded = await wrapper.encode(uuid, message);
      expect(encoded.chunks.length).toBeGreaterThan(0);

      const decoded = await wrapper.decode(encoded.chunks[0]);
      expect(decoded.type).toBe("complete");
      if (decoded.type === "complete") {
        expect(decoded.message.name).toBe("test.method");
        expect(decoded.message.body).toEqual([{ value: 42 }]);
      }
    } finally {
      wrapper.dispose();
    }
  });
});
