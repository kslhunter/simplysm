import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ErrorLoggerProvider } from "../../src/providers/ErrorLoggerProvider";
import { LoggerProvider, type LogAdapter } from "../../src/providers/LoggerContext";
import { useLogger } from "../../src/hooks/useLogger";

/** LoggerProvider 안에서 adapter를 configure한 뒤 children을 렌더하는 헬퍼 */
function ConfigureLogger(props: { adapter: LogAdapter; children: any }) {
  useLogger().configure(() => props.adapter);
  return <>{props.children}</>;
}

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

  it("unhandledrejection 이벤트를 캡처하여 logger.error를 호출한다", () => {
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
