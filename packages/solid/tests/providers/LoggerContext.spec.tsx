import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { afterEach } from "vitest";
import {
  LoggerContext,
  LoggerProvider,
  type LoggerContextValue,
} from "../../src/providers/LoggerContext";
import { useContext } from "solid-js";

describe("LoggerContext", () => {
  afterEach(() => {
    cleanup();
  });

  it("returns undefined when useContext is called without Provider", () => {
    createRoot((dispose) => {
      const value = useContext(LoggerContext);
      expect(value).toBeUndefined();
      dispose();
    });
  });

  it("LoggerProvider provides LoggerContextValue correctly", () => {
    let received: LoggerContextValue | undefined;

    function TestComponent() {
      received = useContext(LoggerContext);
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
    expect(received!.adapter()).toBeDefined();
  });

  it("can configure adapter via decorator function", () => {
    const writeSpy = vi.fn();

    let received: LoggerContextValue | undefined;

    function TestComponent() {
      received = useContext(LoggerContext);
      return <div />;
    }

    render(() => (
      <LoggerProvider>
        <TestComponent />
      </LoggerProvider>
    ));

    // Before configure: default adapter exists (consola-based)
    expect(received!.adapter()).toBeDefined();

    received!.configure((origin) => ({
      write: (...args) => {
        writeSpy(...args);
        void origin.write(...args);
      },
    }));

    const adapter = received!.adapter();
    expect(adapter).toBeDefined();
    void adapter.write("info", "test");
    expect(writeSpy).toHaveBeenCalledWith("info", "test");
  });
});
