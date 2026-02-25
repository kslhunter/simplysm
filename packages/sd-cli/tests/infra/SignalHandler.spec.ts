import { describe, it, expect, afterEach } from "vitest";
import { SignalHandler } from "../../src/infra/SignalHandler";

describe("SignalHandler", () => {
  afterEach(() => {
    // 테스트 간 process 리스너 정리
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  });

  it("resolves waitForTermination when termination is requested", async () => {
    const handler = new SignalHandler();

    // 비동기로 종료 요청
    setTimeout(() => handler.requestTermination(), 10);

    await expect(handler.waitForTermination()).resolves.toBeUndefined();
  });

  it("returns termination status correctly", () => {
    const handler = new SignalHandler();

    expect(handler.isTerminated()).toBe(false);

    handler.requestTermination();

    expect(handler.isTerminated()).toBe(true);
  });

  it("ignores duplicate termination requests", () => {
    const handler = new SignalHandler();

    handler.requestTermination();
    handler.requestTermination(); // 두 번째 호출은 무시됨

    expect(handler.isTerminated()).toBe(true);
  });
});
