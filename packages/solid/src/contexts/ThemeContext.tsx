import { SdError } from "@simplysm/core-common";
import {
  type Accessor,
  createContext,
  createEffect,
  createSignal,
  type ParentProps,
  useContext,
} from "solid-js";

/** 테마 타입. "light" 또는 "dark" 값을 가진다. */
export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Accessor<Theme>;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>();

const STORAGE_KEY = "sd-theme";

/**
 * ThemeProvider의 props
 */
export interface ThemeProviderProps extends ParentProps {
  /** 기본 테마. 미지정 시 시스템 설정 또는 "light"를 사용한다. */
  defaultTheme?: Theme;
}

/**
 * 테마 컨텍스트 Provider 컴포넌트.
 * 자식 컴포넌트에서 useTheme()을 통해 테마 상태에 접근할 수 있다.
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="dark">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider(props: ThemeProviderProps) {
  const getInitialTheme = (): Theme => {
    if (typeof window === "undefined") return props.defaultTheme ?? "light";

    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === "light" || stored === "dark") return stored;
    } catch {
      // localStorage 접근 실패 시 무시
    }

    if (props.defaultTheme) return props.defaultTheme;

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const [theme, setThemeSignal] = createSignal<Theme>(getInitialTheme());

  const setTheme = (newTheme: Theme) => {
    setThemeSignal(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // localStorage 저장 실패 시 무시
    }
  };

  const toggleTheme = () => {
    setTheme(theme() === "light" ? "dark" : "light");
  };

  createEffect(() => {
    if (typeof document === "undefined") return;
    const currentTheme = theme();
    document.documentElement.classList.toggle("dark", currentTheme === "dark");
  });

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {props.children}
    </ThemeContext.Provider>
  );
}

/**
 * 테마 컨텍스트에 접근하는 hook.
 * ThemeProvider 내부에서만 사용 가능하다.
 *
 * @returns 테마 상태와 변경 함수를 포함하는 객체
 * @throws ThemeProvider 외부에서 호출 시 에러 발생
 *
 * @example
 * ```tsx
 * const { theme, setTheme, toggleTheme } = useTheme();
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new SdError("useTheme은 ThemeProvider 내부에서만 사용할 수 있습니다.");
  }
  return context;
}
