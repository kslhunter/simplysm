import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, renderHook } from "@solidjs/testing-library";
import { useLogger } from "../../src/hooks/useLogger";
import { LoggerProvider, type LogAdapter } from "../../src/providers/LoggerContext";
import { consola } from "consola";

function loggerWrapper(adapter?: LogAdapter) {
  if (!adapter) {
    return (props: { children: any }) => <>{props.children}</>;
  }
  return (props: { children: any }) => (
    <LoggerProvider adapter={adapter}>{props.children}</LoggerProvider>
  );
}

describe("useLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should return a logger object with log, info, warn, error methods", () => {
    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper() });
    expect(typeof result.log).toBe("function");
    expect(typeof result.info).toBe("function");
    expect(typeof result.warn).toBe("function");
    expect(typeof result.error).toBe("function");
  });

  it("should call consola when no LoggerProvider is present", () => {
    const consolaSpy = {
      log: vi.spyOn(consola, "log").mockImplementation(() => {}),
      info: vi.spyOn(consola, "info").mockImplementation(() => {}),
      warn: vi.spyOn(consola, "warn").mockImplementation(() => {}),
      error: vi.spyOn(consola, "error").mockImplementation(() => {}),
    };

    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper() });

    result.log("log message");
    result.info("info message");
    result.warn("warn message");
    result.error("error message");

    expect(consolaSpy.log).toHaveBeenCalledWith("log message");
    expect(consolaSpy.info).toHaveBeenCalledWith("info message");
    expect(consolaSpy.warn).toHaveBeenCalledWith("warn message");
    expect(consolaSpy.error).toHaveBeenCalledWith("error message");
  });

  it("should call adapter only when LoggerProvider is present (no consola)", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };
    const consolaSpy = vi.spyOn(consola, "info").mockImplementation(() => {});

    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper(adapter) });

    result.info("test message", { key: "value" });

    expect(writeSpy).toHaveBeenCalledWith("info", "test message", { key: "value" });
    expect(consolaSpy).not.toHaveBeenCalled();
  });

  it("should pass all severity levels to adapter", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper(adapter) });

    result.log("a");
    result.info("b");
    result.warn("c");
    result.error("d");

    expect(writeSpy).toHaveBeenCalledWith("log", "a");
    expect(writeSpy).toHaveBeenCalledWith("info", "b");
    expect(writeSpy).toHaveBeenCalledWith("warn", "c");
    expect(writeSpy).toHaveBeenCalledWith("error", "d");
  });

  it("should work correctly in a component", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    function TestComponent() {
      const logger = useLogger();
      logger.info("component log");
      return <div>test</div>;
    }

    render(() => <TestComponent />, { wrapper: loggerWrapper(adapter) });

    expect(writeSpy).toHaveBeenCalledWith("info", "component log");
  });
});
