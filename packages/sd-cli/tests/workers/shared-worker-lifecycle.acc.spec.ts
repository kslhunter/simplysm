import { describe, it, expect, vi } from "vitest";

// setupConsola는 consola 글로벌 상태를 변경하므로 모킹
vi.mock("@simplysm/core-node", () => ({
  setupConsola: vi.fn(),
}));

const { setupWorkerLifecycle } = await import("../../src/workers/shared-worker-lifecycle");

describe("setupWorkerLifecycle", () => {
  // Scenario: setupWorkerLifecycle 함수가 4개 초기화 단계를 통합한다
  it("returns tagged logger and working guardStartWatch from single call", () => {
    const cleanup = vi.fn();
    const { logger, guardStartWatch } = setupWorkerLifecycle("test-worker", cleanup);

    // logger가 유효한 ConsolaInstance인지 확인
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");

    // guardStartWatch: 첫 호출은 성공
    expect(() => guardStartWatch()).not.toThrow();

    // guardStartWatch: 두 번째 호출은 에러
    expect(() => guardStartWatch()).toThrow("startWatch can only be called once per Worker");
  });
});
