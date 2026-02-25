import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot } from "solid-js";
import { createIMEHandler } from "../../src/hooks/createIMEHandler";

describe("createIMEHandler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("immediately calls setValue when handleInput is called in non-composing state", () => {
    const setValue = vi.fn();

    createRoot((dispose) => {
      const ime = createIMEHandler(setValue);

      ime.handleInput("hello", false);

      expect(setValue).toHaveBeenCalledWith("hello");
      expect(ime.composingValue()).toBeNull();
      dispose();
    });
  });

  it("only updates composingValue when handleInput is called during composition", () => {
    const setValue = vi.fn();

    void createRoot((dispose) => {
      const ime = createIMEHandler(setValue);

      ime.handleCompositionStart();
      ime.handleInput("한", true);

      expect(setValue).not.toHaveBeenCalled();
      expect(ime.composingValue()).toBe("한");
      dispose();
    });
  });

  it("calls setValue via setTimeout(0) after compositionEnd", () => {
    const setValue = vi.fn();

    void createRoot((dispose) => {
      const ime = createIMEHandler(setValue);

      ime.handleCompositionStart();
      ime.handleInput("한글", true);
      ime.handleCompositionEnd("한글");

      expect(setValue).not.toHaveBeenCalled();
      expect(ime.composingValue()).toBe("한글");

      vi.advanceTimersByTime(0);

      expect(setValue).toHaveBeenCalledWith("한글");
      expect(ime.composingValue()).toBeNull();
      dispose();
    });
  });

  it("immediately commits uncommitted value via flushComposition", () => {
    const setValue = vi.fn();

    void createRoot((dispose) => {
      const ime = createIMEHandler(setValue);

      ime.handleCompositionStart();
      ime.handleInput("한", true);

      ime.flushComposition();

      expect(setValue).toHaveBeenCalledWith("한");
      expect(ime.composingValue()).toBeNull();
      dispose();
    });
  });
});
