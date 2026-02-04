import { describe, it, expect, afterEach } from "vitest";
import { SignalHandler } from "../../src/infra/SignalHandler";

describe("SignalHandler", () => {
  afterEach(() => {
    // 테스트 간 process 리스너 정리
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");
  });

  it("종료 요청 시 waitForTermination이 resolve된다", async () => {
    const handler = new SignalHandler();

    // 비동기로 종료 요청
    setTimeout(() => handler.requestTermination(), 10);

    await expect(handler.waitForTermination()).resolves.toBeUndefined();
  });

  it("isTerminated가 종료 상태를 반환한다", () => {
    const handler = new SignalHandler();

    expect(handler.isTerminated()).toBe(false);

    handler.requestTermination();

    expect(handler.isTerminated()).toBe(true);
  });

  it("중복 종료 요청은 무시된다", () => {
    const handler = new SignalHandler();

    handler.requestTermination();
    handler.requestTermination(); // 두 번째 호출은 무시됨

    expect(handler.isTerminated()).toBe(true);
  });
});
