import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { afterEach } from "vitest";
import {
  LoggerContext,
  LoggerProvider,
  useLogAdapter,
  type LogAdapter,
  type LoggerContextValue,
} from "../../src/providers/LoggerContext";
import { useContext } from "solid-js";

describe("LoggerContext", () => {
  afterEach(() => {
    cleanup();
  });

  it("Provider 없이 useContext하면 undefined를 반환한다", () => {
    createRoot((dispose) => {
      const value = useContext(LoggerContext);
      expect(value).toBeUndefined();
      dispose();
    });
  });

  it("LoggerProvider가 LoggerContextValue를 정상 제공한다", () => {
    let received: LoggerContextValue | undefined;

    function TestComponent() {
      received = useLogAdapter();
      return <div />;
    }

    render(() => (
      <LoggerProvider>
        <TestComponent />
      </LoggerProvider>
    ));

    expect(received).toBeDefined();
    expect(typeof received!.adapter).toBe("function");
    expect(typeof received!.configure).toBe("function");
    expect(received!.adapter()).toBeUndefined();
  });

  it("configure()로 adapter를 설정할 수 있다", () => {
    const mockAdapter: LogAdapter = {
      write: vi.fn(),
    };

    let received: LoggerContextValue | undefined;

    function TestComponent() {
      received = useLogAdapter();
      return <div />;
    }

    render(() => (
      <LoggerProvider>
        <TestComponent />
      </LoggerProvider>
    ));

    expect(received!.adapter()).toBeUndefined();
    received!.configure(mockAdapter);
    expect(received!.adapter()).toBe(mockAdapter);
  });
});
