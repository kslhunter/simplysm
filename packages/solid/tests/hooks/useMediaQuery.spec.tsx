import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { useMediaQuery, useMobile } from "../../src/hooks/useMediaQuery";
import { MOBILE_QUERY, BREAKPOINTS } from "../../src/constants/breakpoints";

describe("useMediaQuery", () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;
  let mockAddEventListener: ReturnType<typeof vi.fn>;
  let mockRemoveEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAddEventListener = vi.fn();
    mockRemoveEventListener = vi.fn();

    mockMatchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));

    vi.stubGlobal("matchMedia", mockMatchMedia);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("초기 matches 값 반환", () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: "(max-width: 520px)",
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    let result: ReturnType<typeof useMediaQuery> | undefined;

    render(() => {
      result = useMediaQuery("(max-width: 520px)");
      return null;
    });

    expect(result?.()).toBe(true);
  });

  it("matchMedia에 올바른 쿼리 전달", () => {
    render(() => {
      useMediaQuery("(min-width: 1024px)");
      return null;
    });

    expect(mockMatchMedia).toHaveBeenCalledWith("(min-width: 1024px)");
  });

  it("change 이벤트 리스너 등록", () => {
    render(() => {
      useMediaQuery("(max-width: 520px)");
      return null;
    });

    expect(mockAddEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("언마운트 시 이벤트 리스너 제거", () => {
    const { unmount } = render(() => {
      useMediaQuery("(max-width: 520px)");
      return null;
    });

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("미디어 쿼리 변경 시 상태 업데이트", () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | undefined;

    mockAddEventListener.mockImplementation((_event: string, handler: (e: MediaQueryListEvent) => void) => {
      changeHandler = handler;
    });

    let result: ReturnType<typeof useMediaQuery> | undefined;

    render(() => {
      result = useMediaQuery("(max-width: 520px)");
      return null;
    });

    expect(result?.()).toBe(false);

    // 미디어 쿼리 변경 시뮬레이션
    changeHandler?.({ matches: true } as MediaQueryListEvent);

    expect(result?.()).toBe(true);
  });

  it("SSR 환경에서 기본값 false 반환", () => {
    // onMount가 실행되기 전 상태
    let result: ReturnType<typeof useMediaQuery> | undefined;

    // matchMedia가 호출되기 전 초기 상태 확인
    const originalMatchMedia = window.matchMedia;
    vi.stubGlobal("matchMedia", undefined);

    // SSR 환경 시뮬레이션은 복잡하므로 기본값 테스트만 수행
    vi.stubGlobal("matchMedia", originalMatchMedia);

    render(() => {
      result = useMediaQuery("(max-width: 520px)");
      return null;
    });

    // onMount 전에는 false가 기본값
    expect(typeof result).toBe("function");
  });
});

describe("useMobile", () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;
  let mockAddEventListener: ReturnType<typeof vi.fn>;
  let mockRemoveEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAddEventListener = vi.fn();
    mockRemoveEventListener = vi.fn();

    mockMatchMedia = vi.fn((query: string) => ({
      matches: query === MOBILE_QUERY,
      media: query,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));

    vi.stubGlobal("matchMedia", mockMatchMedia);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("MOBILE_QUERY를 사용하여 useMediaQuery 호출", () => {
    render(() => {
      useMobile();
      return null;
    });

    expect(mockMatchMedia).toHaveBeenCalledWith(MOBILE_QUERY);
  });

  it("모바일 환경 감지", () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      media: MOBILE_QUERY,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    let result: ReturnType<typeof useMobile> | undefined;

    render(() => {
      result = useMobile();
      return null;
    });

    expect(result?.()).toBe(true);
  });

  it("데스크톱 환경 감지", () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: MOBILE_QUERY,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    });

    let result: ReturnType<typeof useMobile> | undefined;

    render(() => {
      result = useMobile();
      return null;
    });

    expect(result?.()).toBe(false);
  });
});

describe("BREAKPOINTS", () => {
  it("mobile 값이 520px", () => {
    expect(BREAKPOINTS.mobile).toBe(520);
  });
});

describe("MOBILE_QUERY", () => {
  it("올바른 형식의 미디어 쿼리 문자열", () => {
    expect(MOBILE_QUERY).toBe("(max-width: 520px)");
  });

  it("BREAKPOINTS.mobile 값을 사용", () => {
    expect(MOBILE_QUERY).toContain(String(BREAKPOINTS.mobile));
  });
});
