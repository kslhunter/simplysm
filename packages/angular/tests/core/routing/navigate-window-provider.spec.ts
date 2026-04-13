import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SdNavigateWindowProvider } from "../../../src/core/routing/sd-navigate-window.provider";

describe("Feature 1.2: URL 세미콜론 제거 (LOGIC-006)", () => {
  let provider: SdNavigateWindowProvider;
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new SdNavigateWindowProvider();
    windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  it("params 미지정 시 URL에 세미콜론이 포함되지 않는다", () => {
    provider.open("navigate");

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringMatching(/#navigate$/),
      "_blank",
    );
  });

  it("빈 객체 params 시 URL에 세미콜론이 포함되지 않는다", () => {
    provider.open("navigate", {});

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringMatching(/#navigate$/),
      "_blank",
    );
  });

  it("params 지정 시 세미콜론+params가 포함된다", () => {
    provider.open("navigate", { foo: "bar" });

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining("#navigate;foo=bar"),
      "_blank",
    );
  });
});

describe("FIX-1 Slice 4: SdNavigateWindowProvider", () => {
  let provider: SdNavigateWindowProvider;
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    provider = new SdNavigateWindowProvider();
    windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);
  });

  afterEach(() => {
    windowOpenSpy.mockRestore();
  });

  it("features 파라미터가 window.open의 세 번째 인수로 전달된다", () => {
    // features가 비어 있지 않은 문자열이면 새 창으로 열린다 (isWindow가 false여도)
    provider.open("/page", {}, "width=800,height=600");

    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.any(String),
      "",
      "width=800,height=600",
    );
  });

  it("여러 팝업을 열면 모두 _openedWindows Set에 추적된다", () => {
    const mockWindow1 = { close: vi.fn(), closed: false } as unknown as Window;
    const mockWindow2 = { close: vi.fn(), closed: false } as unknown as Window;
    windowOpenSpy.mockReturnValueOnce(mockWindow1).mockReturnValueOnce(mockWindow2);

    provider.open("/page1", {}, "width=800");
    provider.open("/page2", {}, "width=800");

    const openedWindows = (provider as any)._openedWindows as Set<Window>;
    expect(openedWindows.size).toBe(2);
    expect(openedWindows.has(mockWindow1)).toBe(true);
    expect(openedWindows.has(mockWindow2)).toBe(true);
  });

  it("hash에 세미콜론이 없으면 isWindow는 false를 반환한다", () => {
    const origHash = window.location.hash;
    window.location.hash = "#/main";

    expect(provider.isWindow).toBe(false);

    window.location.hash = origHash;
  });

  it("hash에 세미콜론과 window=true가 있으면 isWindow는 true를 반환한다", () => {
    const origHash = window.location.hash;
    window.location.hash = "#/main;window=true";

    expect(provider.isWindow).toBe(true);

    window.location.hash = origHash;
  });

  it("부모 unload 시 모든 열린 팝업이 닫힌다", () => {
    const mockWindow1 = { close: vi.fn(), closed: false } as unknown as Window;
    const mockWindow2 = { close: vi.fn(), closed: false } as unknown as Window;
    windowOpenSpy.mockReturnValueOnce(mockWindow1).mockReturnValueOnce(mockWindow2);

    provider.open("/page1", {}, "width=800");
    provider.open("/page2", {}, "width=800");

    window.dispatchEvent(new Event("beforeunload"));

    expect(mockWindow1.close).toHaveBeenCalled();
    expect(mockWindow2.close).toHaveBeenCalled();
  });
});
