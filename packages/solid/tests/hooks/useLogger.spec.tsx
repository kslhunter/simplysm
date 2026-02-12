import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, renderHook, waitFor } from "@solidjs/testing-library";
import { LogAdapter } from "../../src/configs/LogConfig";
import { useLogger } from "../../src/hooks/useLogger";
import { consola } from "consola";

describe("useLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    LogAdapter.write = undefined;
  });

  it("should return a logger object with log, info, warn, error methods", () => {
    const { result } = renderHook(() => useLogger());
    expect(result).toHaveProperty("log");
    expect(result).toHaveProperty("info");
    expect(result).toHaveProperty("warn");
    expect(result).toHaveProperty("error");
    expect(typeof result.log).toBe("function");
    expect(typeof result.info).toBe("function");
    expect(typeof result.warn).toBe("function");
    expect(typeof result.error).toBe("function");
  });

  it("should call consola methods when logging", () => {
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

  it("should call LogAdapter.write if configured", async () => {
    const writeSpy = vi.fn();
    LogAdapter.write = writeSpy;

    const { result } = renderHook(() => useLogger());

    result.info("test message");

    await waitFor(() => {
      expect(writeSpy).toHaveBeenCalledWith({
        level: "info",
        message: "test message",
        timestamp: expect.any(Number),
      });
    });
  });

  it("should swallow errors from LogAdapter.write and log to consola.error", async () => {
    const adapterError = new Error("Adapter failed");
    LogAdapter.write = vi.fn(() => {
      throw adapterError;
    });

    const consolaErrorSpy = vi.spyOn(consola, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useLogger());

    result.warn("test message");

    await waitFor(() => {
      expect(consolaErrorSpy).toHaveBeenCalledWith("Failed to write log to adapter:", adapterError);
    });
  });

  it("should include multiple arguments in the message", async () => {
    const writeSpy = vi.fn();
    LogAdapter.write = writeSpy;

    const { result } = renderHook(() => useLogger());

    result.info("message", { key: "value" }, 123);

    await waitFor(() => {
      expect(writeSpy).toHaveBeenCalledWith({
        level: "info",
        message: 'message {"key":"value"} 123',
        timestamp: expect.any(Number),
      });
    });
  });

  it("should work correctly in a component", async () => {
    const writeSpy = vi.fn();
    LogAdapter.write = writeSpy;
    const consolaInfoSpy = vi.spyOn(consola, "info").mockImplementation(() => {});

    function TestComponent() {
      const logger = useLogger();
      logger.info("component log");
      return <div>test</div>;
    }

    render(() => <TestComponent />);

    expect(consolaInfoSpy).toHaveBeenCalledWith("component log");
    await waitFor(() => {
      expect(writeSpy).toHaveBeenCalledWith({
        level: "info",
        message: "component log",
        timestamp: expect.any(Number),
      });
    });
  });
});
