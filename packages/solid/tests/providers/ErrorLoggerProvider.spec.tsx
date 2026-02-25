import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ErrorLoggerProvider } from "../../src/providers/ErrorLoggerProvider";
import { LoggerProvider, type LogAdapter } from "../../src/providers/LoggerContext";
import { useLogger } from "../../src/hooks/useLogger";

/** Helper to configure adapter within LoggerProvider and render children */
function ConfigureLogger(props: { adapter: LogAdapter; children: any }) {
  useLogger().configure(() => props.adapter);
  return <>{props.children}</>;
}

describe("ErrorLoggerProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children correctly", () => {
    const { getByText } = render(() => (
      <ErrorLoggerProvider>
        <div>child content</div>
      </ErrorLoggerProvider>
    ));

    expect(getByText("child content")).toBeDefined();
  });

  it("captures window error events and calls logger.error", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    render(() => (
      <LoggerProvider>
        <ConfigureLogger adapter={adapter}>
          <ErrorLoggerProvider>
            <div />
          </ErrorLoggerProvider>
        </ConfigureLogger>
      </LoggerProvider>
    ));

    const errorEvent = new ErrorEvent("error", {
      error: new Error("test error"),
      message: "test error",
    });
    window.dispatchEvent(errorEvent);

    expect(writeSpy).toHaveBeenCalledWith("error", "Uncaught error:", expect.any(Error));
  });

  it("captures unhandledrejection events and calls logger.error", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    render(() => (
      <LoggerProvider>
        <ConfigureLogger adapter={adapter}>
          <ErrorLoggerProvider>
            <div />
          </ErrorLoggerProvider>
        </ConfigureLogger>
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
