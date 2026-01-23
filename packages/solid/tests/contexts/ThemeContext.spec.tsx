import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ThemeProvider, useTheme } from "../../src/contexts/ThemeContext";

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    cleanup();
  });

  it("ThemeProvider 기본 렌더링", () => {
    const { container } = render(() => (
      <ThemeProvider>
        <div>테스트</div>
      </ThemeProvider>
    ));

    expect(container.textContent).toBe("테스트");
  });

  it("useTheme으로 컨텍스트 접근", () => {
    let themeValue: string | undefined;

    render(() => (
      <ThemeProvider>
        <TestConsumer
          onMount={(theme) => {
            themeValue = theme;
          }}
        />
      </ThemeProvider>
    ));

    expect(themeValue).toBe("light");
  });

  it("setTheme으로 테마 변경", () => {
    let setThemeFn: ((theme: "light" | "dark") => void) | undefined;
    let currentTheme: string | undefined;

    render(() => (
      <ThemeProvider>
        <TestConsumerWithSetTheme
          onMount={(theme, setTheme) => {
            currentTheme = theme;
            setThemeFn = setTheme;
          }}
        />
      </ThemeProvider>
    ));

    expect(currentTheme).toBe("light");

    setThemeFn?.("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggleTheme으로 테마 토글", () => {
    let toggleFn: (() => void) | undefined;

    render(() => (
      <ThemeProvider>
        <TestConsumerWithToggle
          onMount={(toggle) => {
            toggleFn = toggle;
          }}
        />
      </ThemeProvider>
    ));

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    toggleFn?.();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    toggleFn?.();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("localStorage에 테마 저장", () => {
    let setThemeFn: ((theme: "light" | "dark") => void) | undefined;

    render(() => (
      <ThemeProvider>
        <TestConsumerWithSetTheme
          onMount={(_, setTheme) => {
            setThemeFn = setTheme;
          }}
        />
      </ThemeProvider>
    ));

    setThemeFn?.("dark");
    expect(localStorage.getItem("sd-theme")).toBe("dark");
  });

  it("localStorage에서 테마 복원", () => {
    localStorage.setItem("sd-theme", "dark");
    let themeValue: string | undefined;

    render(() => (
      <ThemeProvider>
        <TestConsumer
          onMount={(theme) => {
            themeValue = theme;
          }}
        />
      </ThemeProvider>
    ));

    expect(themeValue).toBe("dark");
  });

  it("ThemeProvider 없이 useTheme 호출 시 에러", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(() => <TestConsumer onMount={() => {}} />);
    }).toThrow("useTheme은 ThemeProvider 내부에서만 사용할 수 있습니다.");

    consoleError.mockRestore();
  });

  it("defaultTheme prop 적용", () => {
    let themeValue: string | undefined;

    render(() => (
      <ThemeProvider defaultTheme="dark">
        <TestConsumer
          onMount={(theme) => {
            themeValue = theme;
          }}
        />
      </ThemeProvider>
    ));

    expect(themeValue).toBe("dark");
  });

  it("시스템 다크모드 감지", () => {
    const matchMediaSpy = vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    let themeValue: string | undefined;

    render(() => (
      <ThemeProvider>
        <TestConsumer
          onMount={(theme) => {
            themeValue = theme;
          }}
        />
      </ThemeProvider>
    ));

    expect(themeValue).toBe("dark");
    matchMediaSpy.mockRestore();
  });

  it("localStorage 접근 실패 시 fallback 동작", () => {
    const localStorageSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage 접근 불가");
    });

    let themeValue: string | undefined;

    render(() => (
      <ThemeProvider>
        <TestConsumer
          onMount={(theme) => {
            themeValue = theme;
          }}
        />
      </ThemeProvider>
    ));

    // localStorage 실패해도 기본값(light) 또는 시스템 설정으로 정상 동작
    expect(themeValue).toBeDefined();
    expect(["light", "dark"]).toContain(themeValue);

    localStorageSpy.mockRestore();
  });

  it("localStorage.setItem 실패 시에도 테마가 정상 변경됨", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });

    let setThemeFn: ((theme: "light" | "dark") => void) | undefined;
    let currentTheme: string | undefined;

    render(() => (
      <ThemeProvider>
        <TestConsumerWithSetTheme
          onMount={(theme, setTheme) => {
            currentTheme = theme;
            setThemeFn = setTheme;
          }}
        />
      </ThemeProvider>
    ));

    expect(currentTheme).toBe("light");

    // setItem 실패해도 테마 변경은 정상 동작해야 함
    setThemeFn?.("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    setItemSpy.mockRestore();
  });

  it("localStorage에 유효하지 않은 값이 있으면 기본값으로 fallback", () => {
    localStorage.setItem("sd-theme", "invalid");

    let themeValue: string | undefined;

    render(() => (
      <ThemeProvider>
        <TestConsumer
          onMount={(theme) => {
            themeValue = theme;
          }}
        />
      </ThemeProvider>
    ));

    // "invalid"는 유효하지 않으므로 시스템 설정 또는 light로 fallback
    expect(themeValue).toBeDefined();
    expect(["light", "dark"]).toContain(themeValue);
  });
});

function TestConsumer(props: { onMount: (theme: string) => void }) {
  const { theme } = useTheme();
  props.onMount(theme());
  return null;
}

function TestConsumerWithSetTheme(props: {
  onMount: (theme: string, setTheme: (theme: "light" | "dark") => void) => void;
}) {
  const { theme, setTheme } = useTheme();
  props.onMount(theme(), setTheme);
  return null;
}

function TestConsumerWithToggle(props: { onMount: (toggle: () => void) => void }) {
  const { toggleTheme } = useTheme();
  props.onMount(toggleTheme);
  return null;
}
