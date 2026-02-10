import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot } from "solid-js";
import { createIMEHandler } from "../../src/utils/createIMEHandler";

describe("createIMEHandler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("비조합 상태에서 handleInput 호출 시 즉시 setValue", () => {
    const setValue = vi.fn();

    createRoot((dispose) => {
      const ime = createIMEHandler(setValue);

      ime.handleInput("hello", false);

      expect(setValue).toHaveBeenCalledWith("hello");
      expect(ime.composingValue()).toBeNull();
      dispose();
    });
  });

  it("조합 중 handleInput 호출 시 composingValue만 업데이트", () => {
    const setValue = vi.fn();

    createRoot((dispose) => {
      const ime = createIMEHandler(setValue);

      ime.handleCompositionStart();
      ime.handleInput("한", true);

      expect(setValue).not.toHaveBeenCalled();
      expect(ime.composingValue()).toBe("한");
      dispose();
    });
  });

  it("compositionEnd 후 setTimeout(0)에서 setValue 호출", () => {
    const setValue = vi.fn();

    createRoot((dispose) => {
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

  it("flushComposition으로 미커밋 값 즉시 커밋", () => {
    const setValue = vi.fn();

    createRoot((dispose) => {
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
