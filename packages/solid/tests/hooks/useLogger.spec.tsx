import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, renderHook } from "@solidjs/testing-library";
import { useLogger } from "../../src/hooks/useLogger";
import { ConfigContext, type LogAdapter } from "../../src/providers/ConfigContext";
import { consola } from "consola";

function configWrapper(logger?: LogAdapter) {
  return (props: { children: any }) => (
    <ConfigContext.Provider value={{ clientName: "test", logger }}>{props.children}</ConfigContext.Provider>
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
    const { result } = renderHook(() => useLogger(), { wrapper: configWrapper() });
    expect(typeof result.log).toBe("function");
    expect(typeof result.info).toBe("function");
    expect(typeof result.warn).toBe("function");
    expect(typeof result.error).toBe("function");
  });

  it("should call consola when no adapter is configured", () => {
    const consolaSpy = {
      log: vi.spyOn(consola, "log").mockImplementation(() => {}),
      info: vi.spyOn(consola, "info").mockImplementation(() => {}),
      warn: vi.spyOn(consola, "warn").mockImplementation(() => {}),
      error: vi.spyOn(consola, "error").mockImplementation(() => {}),
    };

    const { result } = renderHook(() => useLogger(), { wrapper: configWrapper() });

    result.log("log message");
    result.info("info message");
    result.warn("warn message");
    result.error("error message");

    expect(consolaSpy.log).toHaveBeenCalledWith("log message");
    expect(consolaSpy.info).toHaveBeenCalledWith("info message");
    expect(consolaSpy.warn).toHaveBeenCalledWith("warn message");
    expect(consolaSpy.error).toHaveBeenCalledWith("error message");
  });

  it("should call adapter only when adapter is configured (no consola)", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };
    const consolaSpy = vi.spyOn(consola, "info").mockImplementation(() => {});

    const { result } = renderHook(() => useLogger(), { wrapper: configWrapper(adapter) });

    result.info("test message", { key: "value" });

    expect(writeSpy).toHaveBeenCalledWith("info", "test message", { key: "value" });
    expect(consolaSpy).not.toHaveBeenCalled();
  });

  it("should pass all severity levels to adapter", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    const { result } = renderHook(() => useLogger(), { wrapper: configWrapper(adapter) });

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

    render(() => <TestComponent />, { wrapper: configWrapper(adapter) });

    expect(writeSpy).toHaveBeenCalledWith("info", "component log");
  });
});
