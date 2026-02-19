import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@solidjs/testing-library";
import { useLogger } from "../../src/hooks/useLogger";
import { LoggerProvider, type LogAdapter } from "../../src/providers/LoggerContext";
import { consola } from "consola";

function loggerWrapper() {
  return (props: { children: any }) => <LoggerProvider>{props.children}</LoggerProvider>;
}

describe("useLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should return a logger object with log, info, warn, error, configure methods", () => {
    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper() });
    expect(typeof result.log).toBe("function");
    expect(typeof result.info).toBe("function");
    expect(typeof result.warn).toBe("function");
    expect(typeof result.error).toBe("function");
    expect(typeof result.configure).toBe("function");
  });

  it("should call consola when no LoggerProvider is present", () => {
    const consolaSpy = {
      log: vi.spyOn(consola, "log").mockImplementation(() => {}),
      info: vi.spyOn(consola, "info").mockImplementation(() => {}),
      warn: vi.spyOn(consola, "warn").mockImplementation(() => {}),
      error: vi.spyOn(consola, "error").mockImplementation(() => {}),
    };

    const { result } = renderHook(() => useLogger());

    result.log("log message");
    result.info("info message");
    result.warn("warn message");
    result.error("error message");

    expect(consolaSpy.log).toHaveBeenCalledWith("log message");
    expect(consolaSpy.info).toHaveBeenCalledWith("info message");
    expect(consolaSpy.warn).toHaveBeenCalledWith("warn message");
    expect(consolaSpy.error).toHaveBeenCalledWith("error message");
  });

  it("should call consola before configure() is called (with Provider)", () => {
    const consolaSpy = vi.spyOn(consola, "info").mockImplementation(() => {});

    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper() });
    result.info("before configure");

    expect(consolaSpy).toHaveBeenCalledWith("before configure");
  });

  it("should use adapter after configure() is called", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };
    const consolaSpy = vi.spyOn(consola, "info").mockImplementation(() => {});

    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper() });

    result.configure(adapter);
    result.info("test message", { key: "value" });

    expect(writeSpy).toHaveBeenCalledWith("info", "test message", { key: "value" });
    expect(consolaSpy).not.toHaveBeenCalled();
  });

  it("should pass all severity levels to adapter after configure()", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper() });
    result.configure(adapter);

    result.log("a");
    result.info("b");
    result.warn("c");
    result.error("d");

    expect(writeSpy).toHaveBeenCalledWith("log", "a");
    expect(writeSpy).toHaveBeenCalledWith("info", "b");
    expect(writeSpy).toHaveBeenCalledWith("warn", "c");
    expect(writeSpy).toHaveBeenCalledWith("error", "d");
  });

  it("should throw when configure() is called without LoggerProvider", () => {
    const { result } = renderHook(() => useLogger());
    const adapter: LogAdapter = { write: vi.fn() };

    expect(() => result.configure(adapter)).toThrow(
      "configure()는 LoggerProvider 내부에서만 사용할 수 있습니다",
    );
  });
});
