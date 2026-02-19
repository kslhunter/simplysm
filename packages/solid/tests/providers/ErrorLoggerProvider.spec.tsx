import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ErrorLoggerProvider } from "../../src/providers/ErrorLoggerProvider";
import { LoggerProvider, type LogAdapter } from "../../src/providers/LoggerContext";

describe("ErrorLoggerProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("children을 정상적으로 렌더링한다", () => {
    const { getByText } = render(() => (
      <ErrorLoggerProvider>
        <div>child content</div>
      </ErrorLoggerProvider>
    ));

    expect(getByText("child content")).toBeDefined();
  });

  it("window error 이벤트를 캡처하여 logger.error를 호출한다", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    render(() => (
      <LoggerProvider adapter={adapter}>
        <ErrorLoggerProvider>
          <div />
        </ErrorLoggerProvider>
      </LoggerProvider>
    ));

    const errorEvent = new ErrorEvent("error", {
      error: new Error("test error"),
      message: "test error",
    });
    window.dispatchEvent(errorEvent);

    expect(writeSpy).toHaveBeenCalledWith("error", "Uncaught error:", expect.any(Error));
  });

  it("unhandledrejection 이벤트를 캡처하여 logger.error를 호출한다", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    render(() => (
      <LoggerProvider adapter={adapter}>
        <ErrorLoggerProvider>
          <div />
        </ErrorLoggerProvider>
      </LoggerProvider>
    ));

    const rejectionEvent = new PromiseRejectionEvent("unhandledrejection", {
      promise: Promise.resolve(),
      reason: "rejection reason",
    });
    window.dispatchEvent(rejectionEvent);

    expect(writeSpy).toHaveBeenCalledWith("error", "Unhandled rejection:", "rejection reason");
  });
});
