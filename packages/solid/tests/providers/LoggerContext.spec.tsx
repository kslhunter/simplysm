import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { afterEach } from "vitest";
import {
  LoggerContext,
  LoggerProvider,
  useLogAdapter,
  type LogAdapter,
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

  it("LoggerProvider가 LogAdapter를 정상 제공한다", () => {
    const mockAdapter: LogAdapter = {
      write: vi.fn(),
    };

    let received: LogAdapter | undefined;

    function TestComponent() {
      received = useLogAdapter();
      return <div />;
    }

    render(() => (
      <LoggerProvider adapter={mockAdapter}>
        <TestComponent />
      </LoggerProvider>
    ));

    expect(received).toBe(mockAdapter);
  });
});
