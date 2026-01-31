import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { ThemeProvider, useTheme } from "../../src/contexts/ThemeContext";
import { ConfigProvider } from "../../src/contexts/ConfigContext";
import { lightTheme, darkTheme } from "../../src/styles/variables/theme.css";

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(lightTheme, darkTheme);
  });

  const TestComponent = () => {
    const { theme, setTheme } = useTheme();
    return (
      <div>
        <span data-testid="theme">{theme()}</span>
        <button onClick={() => setTheme("dark")}>다크 모드</button>
        <button onClick={() => setTheme("light")}>라이트 모드</button>
      </div>
    );
  };

  it("기본 테마는 light이다", () => {
    render(() => (
      <ConfigProvider staticClientName="test-app">
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </ConfigProvider>
    ));

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("테마를 변경하면 상태가 업데이트된다", () => {
    render(() => (
      <ConfigProvider staticClientName="test-app">
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </ConfigProvider>
    ));

    fireEvent.click(screen.getByRole("button", { name: "다크 모드" }));

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("테마 변경 시 html 요소에 클래스가 적용된다", () => {
    render(() => (
      <ConfigProvider staticClientName="test-app">
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </ConfigProvider>
    ));

    // 초기: light 테마 클래스
    expect(document.documentElement.classList.contains(lightTheme)).toBe(true);

    // dark로 변경
    fireEvent.click(screen.getByRole("button", { name: "다크 모드" }));

    expect(document.documentElement.classList.contains(darkTheme)).toBe(true);
    expect(document.documentElement.classList.contains(lightTheme)).toBe(false);
  });

  it("테마가 localStorage에 저장된다", () => {
    render(() => (
      <ConfigProvider staticClientName="test-app">
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </ConfigProvider>
    ));

    fireEvent.click(screen.getByRole("button", { name: "다크 모드" }));

    expect(localStorage.getItem("test-app:theme")).toBe("dark");
  });

  it("ThemeProvider 외부에서 useTheme 호출 시 에러 발생", () => {
    function checkUseThemeError(): boolean {
      try {
        useTheme();
        return false;
      } catch {
        return true;
      }
    }

    const hasError = checkUseThemeError();

    render(() => <div>{hasError ? "에러 발생" : "에러 없음"}</div>);

    expect(screen.getByText("에러 발생")).toBeInTheDocument();
  });
});
