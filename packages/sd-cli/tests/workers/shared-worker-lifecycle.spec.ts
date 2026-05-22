import { describe, it, expect, vi, beforeEach } from "vitest";
import * as coreCommon from "@simplysm/core-common";
import * as coreNode from "@simplysm/core-node";

// setupConsola는 consola 글로벌 상태를 변경하므로 spy로 차단
vi.spyOn(coreNode, "setupConsola").mockImplementation(() => undefined);

import { setupWorkerLifecycle } from "../../src/workers/shared-worker-lifecycle";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("setupWorkerLifecycle logger tag", () => {
  // Scenario: 각 워커별 고유 태그가 생성된다
  it("creates logger with 'sd:cli:{workerName}:worker' tag pattern", () => {
    const createLoggerSpy = vi.spyOn(coreCommon, "createLogger");

    setupWorkerLifecycle("server-build", vi.fn());

    expect(createLoggerSpy).toHaveBeenCalledWith("sd:cli:server-build:worker");
  });

  it("uses different tag for different worker names", () => {
    const createLoggerSpy = vi.spyOn(coreCommon, "createLogger");

    setupWorkerLifecycle("client", vi.fn());

    expect(createLoggerSpy).toHaveBeenCalledWith("sd:cli:client:worker");
  });
});

describe("setupWorkerLifecycle guardStartWatch", () => {
  it("returns independent guard per call", () => {
    const result1 = setupWorkerLifecycle("worker-a", vi.fn());
    const result2 = setupWorkerLifecycle("worker-b", vi.fn());

    // 각 guard는 독립적이어야 함
    expect(() => result1.guardStartWatch()).not.toThrow();
    expect(() => result2.guardStartWatch()).not.toThrow();

    // 각각 두 번째 호출은 에러
    expect(() => result1.guardStartWatch()).toThrow();
    expect(() => result2.guardStartWatch()).toThrow();
  });
});
