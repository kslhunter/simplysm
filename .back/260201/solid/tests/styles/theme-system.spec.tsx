import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@solidjs/testing-library";
import { ThemeProvider, useTheme } from "../../src/contexts/ThemeContext";
import { ConfigProvider } from "../../src/contexts/ConfigContext";
import { lightTheme, darkTheme, themeVars } from "../../src/styles/variables/theme.css";
import { tokenVars } from "../../src/styles/variables/token.css";
import { atoms } from "../../src/styles/atoms.css";
import { Button } from "../../src/components/controls/button/button";
import { Checkbox } from "../../src/components/controls/choice/checkbox";
import { TextField } from "../../src/components/controls/field/text-field";

describe("Theme System Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(lightTheme, darkTheme);
  });

  describe("themeVars CSS Variables", () => {
    it("themeVars 토큰 구조가 올바르게 정의되어 있다", () => {
      // control 카테고리
      expect(themeVars.control).toBeDefined();
      expect(themeVars.control.primary).toBeDefined();
      expect(themeVars.control.primary.base).toBeDefined();
      expect(themeVars.control.primary.hover).toBeDefined();
      expect(themeVars.control.primary.active).toBeDefined();
      expect(themeVars.control.primary.muted).toBeDefined();

      // surface 카테고리
      expect(themeVars.surface).toBeDefined();
      expect(themeVars.surface.base).toBeDefined();
      expect(themeVars.surface.elevated).toBeDefined();

      // text 카테고리
      expect(themeVars.text).toBeDefined();
      expect(themeVars.text.base).toBeDefined();
      expect(themeVars.text.muted).toBeDefined();

      // border 카테고리
      expect(themeVars.border).toBeDefined();
      expect(themeVars.border.base).toBeDefined();
    });

    it("모든 control 테마가 정의되어 있다", () => {
      const expectedThemes = [
        "primary",
        "secondary",
        "success",
        "warning",
        "danger",
        "info",
        "gray",
        "slate",
      ];

      for (const theme of expectedThemes) {
        expect(themeVars.control[theme as keyof typeof themeVars.control]).toBeDefined();
      }
    });
  });

  describe("tokenVars Design Tokens", () => {
    it("spacing 토큰이 올바르게 정의되어 있다", () => {
      expect(tokenVars.spacing).toBeDefined();
      // vanilla-extract는 CSS 변수 참조를 반환함 (예: "var(--spacing-none__xxx)")
      expect(tokenVars.spacing.none).toContain("var(--");
      expect(tokenVars.spacing.xs).toBeDefined();
      expect(tokenVars.spacing.sm).toBeDefined();
      expect(tokenVars.spacing.base).toBeDefined();
      expect(tokenVars.spacing.lg).toBeDefined();
    });

    it("radius 토큰이 올바르게 정의되어 있다", () => {
      expect(tokenVars.radius).toBeDefined();
      // vanilla-extract는 CSS 변수 참조를 반환함
      expect(tokenVars.radius.none).toContain("var(--");
      expect(tokenVars.radius.sm).toBeDefined();
      expect(tokenVars.radius.base).toBeDefined();
      expect(tokenVars.radius.full).toContain("var(--");
    });

    it("font 토큰이 올바르게 정의되어 있다", () => {
      expect(tokenVars.font).toBeDefined();
      expect(tokenVars.font.size.sm).toBeDefined();
      expect(tokenVars.font.size.base).toBeDefined();
      expect(tokenVars.font.lineHeight.normal).toBeDefined();
    });
  });

  describe("atoms Sprinkles Utility", () => {
    it("atoms 함수가 정의되어 있다", () => {
      expect(typeof atoms).toBe("function");
    });

    it("atoms로 spacing 클래스를 생성할 수 있다", () => {
      const className = atoms({ padding: "base", margin: "lg" });
      expect(typeof className).toBe("string");
      expect(className.length).toBeGreaterThan(0);
    });

    it("atoms로 display 클래스를 생성할 수 있다", () => {
      const className = atoms({ display: "flex", flexDirection: "column" });
      expect(typeof className).toBe("string");
      expect(className.length).toBeGreaterThan(0);
    });

    it("atoms shorthand가 동작한다", () => {
      const className = atoms({ p: "base", m: "lg", px: "xl" });
      expect(typeof className).toBe("string");
      expect(className.length).toBeGreaterThan(0);
    });
  });

  describe("Theme Switching", () => {
    const ThemeSwitcher = () => {
      const { theme, setTheme } = useTheme();
      return (
        <div>
          <span data-testid="current-theme">{theme()}</span>
          <button
            data-testid="toggle-theme"
            onClick={() => setTheme(theme() === "light" ? "dark" : "light")}
          >
            Toggle
          </button>
        </div>
      );
    };

    it("테마 전환 시 document.documentElement에 올바른 클래스가 적용된다", () => {
      render(() => (
        <ConfigProvider staticClientName="test-app">
          <ThemeProvider>
            <ThemeSwitcher />
          </ThemeProvider>
        </ConfigProvider>
      ));

      // 초기 상태: light
      expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
      expect(document.documentElement.classList.contains(darkTheme)).toBe(false);

      // dark로 전환
      fireEvent.click(screen.getByTestId("toggle-theme"));

      expect(document.documentElement.classList.contains(lightTheme)).toBe(false);
      expect(document.documentElement.classList.contains(darkTheme)).toBe(true);

      // light로 다시 전환
      fireEvent.click(screen.getByTestId("toggle-theme"));

      expect(document.documentElement.classList.contains(lightTheme)).toBe(true);
      expect(document.documentElement.classList.contains(darkTheme)).toBe(false);
    });

    it("lightTheme과 darkTheme CSS 클래스가 유효한 문자열이다", () => {
      expect(typeof lightTheme).toBe("string");
      expect(typeof darkTheme).toBe("string");
      expect(lightTheme.length).toBeGreaterThan(0);
      expect(darkTheme.length).toBeGreaterThan(0);
      expect(lightTheme).not.toBe(darkTheme);
    });
  });

  describe("Component Style Integration", () => {
    it("Button 컴포넌트가 테마 전환 시 올바르게 렌더링된다", () => {
      const ThemeAwareButton = () => {
        const { setTheme } = useTheme();
        return (
          <div>
            <Button data-testid="test-button" theme="primary">
              Test Button
            </Button>
            <button data-testid="dark-switch" onClick={() => setTheme("dark")}>
              Dark
            </button>
          </div>
        );
      };

      render(() => (
        <ConfigProvider staticClientName="test-app">
          <ThemeProvider>
            <ThemeAwareButton />
          </ThemeProvider>
        </ConfigProvider>
      ));

      const button = screen.getByTestId("test-button");
      expect(button).toBeInTheDocument();

      // 테마 변경
      fireEvent.click(screen.getByTestId("dark-switch"));

      // 버튼이 여전히 렌더링됨
      expect(button).toBeInTheDocument();
    });

    it("Checkbox 컴포넌트가 테마 전환 시 올바르게 렌더링된다", () => {
      const ThemeAwareCheckbox = () => {
        const { setTheme } = useTheme();
        return (
          <div>
            <Checkbox data-testid="test-checkbox">Test Checkbox</Checkbox>
            <button data-testid="dark-switch" onClick={() => setTheme("dark")}>
              Dark
            </button>
            <button data-testid="light-switch" onClick={() => setTheme("light")}>
              Light
            </button>
          </div>
        );
      };

      render(() => (
        <ConfigProvider staticClientName="test-app">
          <ThemeProvider>
            <ThemeAwareCheckbox />
          </ThemeProvider>
        </ConfigProvider>
      ));

      const checkbox = screen.getByTestId("test-choice");
      expect(checkbox).toBeInTheDocument();

      // dark 테마로 전환
      fireEvent.click(screen.getByTestId("dark-switch"));
      expect(checkbox).toBeInTheDocument();

      // light 테마로 다시 전환
      fireEvent.click(screen.getByTestId("light-switch"));
      expect(checkbox).toBeInTheDocument();
    });

    it("TextField 컴포넌트가 테마 전환 시 올바르게 렌더링된다", () => {
      const ThemeAwareTextField = () => {
        const { setTheme } = useTheme();
        return (
          <div>
            <TextField data-testid="test-textfield" placeholder="Test" />
            <button data-testid="dark-switch" onClick={() => setTheme("dark")}>
              Dark
            </button>
            <button data-testid="light-switch" onClick={() => setTheme("light")}>
              Light
            </button>
          </div>
        );
      };

      render(() => (
        <ConfigProvider staticClientName="test-app">
          <ThemeProvider>
            <ThemeAwareTextField />
          </ThemeProvider>
        </ConfigProvider>
      ));

      const textField = screen.getByTestId("test-textfield");
      expect(textField).toBeInTheDocument();

      // dark 테마로 전환
      fireEvent.click(screen.getByTestId("dark-switch"));
      expect(textField).toBeInTheDocument();

      // light 테마로 다시 전환
      fireEvent.click(screen.getByTestId("light-switch"));
      expect(textField).toBeInTheDocument();
    });
  });

  describe("CSS Variable Value Changes", () => {
    it("테마 전환 시 CSS 변수가 실제로 변경된다", () => {
      const ThemeSwitcher = () => {
        const { setTheme } = useTheme();
        return (
          <div>
            <div data-testid="themed-div" style={{ background: `rgb(${themeVars.surface.base})` }}>
              Themed Content
            </div>
            <button data-testid="dark-switch" onClick={() => setTheme("dark")}>
              Dark
            </button>
            <button data-testid="light-switch" onClick={() => setTheme("light")}>
              Light
            </button>
          </div>
        );
      };

      render(() => (
        <ConfigProvider staticClientName="test-app">
          <ThemeProvider>
            <ThemeSwitcher />
          </ThemeProvider>
        </ConfigProvider>
      ));

      const themedDiv = screen.getByTestId("themed-div");

      // light 테마 상태의 배경색 저장
      const lightBgStyle = getComputedStyle(themedDiv).backgroundColor;

      // dark 테마로 전환
      fireEvent.click(screen.getByTestId("dark-switch"));

      // dark 테마 상태의 배경색
      const darkBgStyle = getComputedStyle(themedDiv).backgroundColor;

      // 배경색이 변경되었는지 확인
      expect(lightBgStyle).not.toBe(darkBgStyle);

      // light 테마로 다시 전환
      fireEvent.click(screen.getByTestId("light-switch"));

      // 원래 배경색으로 돌아왔는지 확인
      const restoredBgStyle = getComputedStyle(themedDiv).backgroundColor;
      expect(restoredBgStyle).toBe(lightBgStyle);
    });

    it("themeVars.text.base가 테마 전환 시 변경된다", () => {
      const ThemeSwitcher = () => {
        const { setTheme } = useTheme();
        return (
          <div>
            <span data-testid="themed-text" style={{ color: `rgb(${themeVars.text.base})` }}>
              Themed Text
            </span>
            <button data-testid="dark-switch" onClick={() => setTheme("dark")}>
              Dark
            </button>
            <button data-testid="light-switch" onClick={() => setTheme("light")}>
              Light
            </button>
          </div>
        );
      };

      render(() => (
        <ConfigProvider staticClientName="test-app">
          <ThemeProvider>
            <ThemeSwitcher />
          </ThemeProvider>
        </ConfigProvider>
      ));

      const themedText = screen.getByTestId("themed-text");

      // light 테마 상태의 텍스트 색상
      const lightTextColor = getComputedStyle(themedText).color;

      // dark 테마로 전환
      fireEvent.click(screen.getByTestId("dark-switch"));

      // dark 테마 상태의 텍스트 색상
      const darkTextColor = getComputedStyle(themedText).color;

      // 텍스트 색상이 변경되었는지 확인
      expect(lightTextColor).not.toBe(darkTextColor);
    });

    it("themeVars.border.base가 테마 전환 시 변경된다", () => {
      const ThemeSwitcher = () => {
        const { setTheme } = useTheme();
        return (
          <div>
            <div
              data-testid="themed-border"
              style={{ border: `2px solid rgb(${themeVars.border.base})`, padding: "1rem" }}
            >
              Bordered Content
            </div>
            <button data-testid="dark-switch" onClick={() => setTheme("dark")}>
              Dark
            </button>
            <button data-testid="light-switch" onClick={() => setTheme("light")}>
              Light
            </button>
          </div>
        );
      };

      render(() => (
        <ConfigProvider staticClientName="test-app">
          <ThemeProvider>
            <ThemeSwitcher />
          </ThemeProvider>
        </ConfigProvider>
      ));

      const themedBorder = screen.getByTestId("themed-border");

      // light 테마 상태의 border 색상
      const lightBorderColor = getComputedStyle(themedBorder).borderColor;

      // dark 테마로 전환
      fireEvent.click(screen.getByTestId("dark-switch"));

      // dark 테마 상태의 border 색상
      const darkBorderColor = getComputedStyle(themedBorder).borderColor;

      // border 색상이 변경되었는지 확인
      expect(lightBorderColor).not.toBe(darkBorderColor);
    });
  });
});
