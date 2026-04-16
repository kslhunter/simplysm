/* eslint-disable no-restricted-properties -- 테스트 환경변수 조작 필요 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { setupWorkerConsola, createOnceGuard, registerCleanupHandlers } from "../../src/runtime/worker-utils";
import consola, { LogLevels } from "consola";

describe("setupWorkerConsola", () => {
  const originalLevel = consola.level;
  const originalReporters = [...consola.options.reporters];
  const originalEnv = process.env["SD_DEBUG"];

  afterEach(() => {
    consola.level = originalLevel;
    consola.options.reporters = originalReporters;
    if (originalEnv == null) {
      delete process.env["SD_DEBUG"];
    } else {
      process.env["SD_DEBUG"] = originalEnv;
    }
  });

  it("sets consola level to debug when SD_DEBUG is 'true'", () => {
    process.env["SD_DEBUG"] = "true";
    setupWorkerConsola();
    expect(consola.level).toBe(LogLevels.debug);
  });

  it("sets consola level to debug even when SD_DEBUG is not set", () => {
    delete process.env["SD_DEBUG"];
    setupWorkerConsola();
    expect(consola.level).toBe(LogLevels.debug);
  });
});

describe("createOnceGuard", () => {
  it("allows first call", () => {
    const guard = createOnceGuard("startWatch");
    expect(() => guard()).not.toThrow();
  });

  it("throws on second call", () => {
    const guard = createOnceGuard("startWatch");
    guard();
    expect(() => guard()).toThrow("Worker당 한 번만 호출할 수 있습니다: startWatch");
  });

  it("includes the label in Korean error message", () => {
    const guard = createOnceGuard("myFunction");
    guard();
    expect(() => guard()).toThrow("Worker당 한 번만 호출할 수 있습니다: myFunction");
  });
});

describe("registerCleanupHandlers", () => {
  it("exits with code 0 on successful cleanup", async () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const listeners: Record<string, Function[]> = {};
    const mockOn = vi.spyOn(process, "on").mockImplementation(
      (event: string | symbol, fn: (...args: unknown[]) => void) => {
        const key = String(event);
        listeners[key] = listeners[key] ?? [];
        listeners[key].push(fn);
        return process;
      },
    );

    const cleanup = vi.fn().mockResolvedValue(undefined);
    const logger = consola.withTag("test");

    registerCleanupHandlers(cleanup, logger);

    // Trigger SIGTERM handler
    const sigTermHandlers = listeners["SIGTERM"];
    expect(sigTermHandlers).toBeDefined();
    const handler = sigTermHandlers[sigTermHandlers.length - 1];
    handler();

    // Wait for async cleanup to complete
    await new Promise((r) => setTimeout(r, 10));

    expect(cleanup).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);

    mockExit.mockRestore();
    mockOn.mockRestore();
  });

  it("exits with code 1 when cleanup fails", async () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const listeners: Record<string, Function[]> = {};
    const mockOn = vi.spyOn(process, "on").mockImplementation(
      (event: string | symbol, fn: (...args: unknown[]) => void) => {
        const key = String(event);
        listeners[key] = listeners[key] ?? [];
        listeners[key].push(fn);
        return process;
      },
    );

    const cleanup = vi.fn().mockRejectedValue(new Error("cleanup error"));
    const logger = consola.withTag("test");

    registerCleanupHandlers(cleanup, logger);

    // Trigger SIGINT handler
    const sigIntHandlers = listeners["SIGINT"];
    expect(sigIntHandlers).toBeDefined();
    const handler2 = sigIntHandlers[sigIntHandlers.length - 1];
    handler2();

    // Wait for async cleanup to complete
    await new Promise((r) => setTimeout(r, 10));

    expect(cleanup).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockOn.mockRestore();
  });
});
