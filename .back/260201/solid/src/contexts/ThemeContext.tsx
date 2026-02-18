import { createContext, createEffect, type ParentComponent, useContext } from "solid-js";
import { isServer } from "solid-js/web";
import { darkTheme, lightTheme } from "../styles/variables/theme.css";
import { useLocalStorage } from "../hooks/useLocalStorage";

const themeClassMap = { light: lightTheme, dark: darkTheme } as const;

type ThemeKey = keyof typeof themeClassMap;

const ThemeContext = createContext<{
  theme: () => ThemeKey;
  setTheme: (t: ThemeKey) => void;
}>();

/**
 * 테마 관리 Provider
 *
 * light/dark 테마를 관리하며, 선택된 테마는 localStorage에 저장된다.
 * 테마 변경 시 html 요소에 해당 테마 클래스를 적용한다.
 *
 * @example
 * ```tsx
 * <ConfigProvider staticClientName="my-app">
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 * </ConfigProvider>
 * ```
 */
export const ThemeProvider: ParentComponent = (props) => {
  const [theme, setTheme] = useLocalStorage<ThemeKey>("theme", "light");

  createEffect(() => {
    if (isServer) return;
    const el = document.documentElement;
    el.classList.remove(lightTheme, darkTheme);
    el.classList.add(themeClassMap[theme()]);
  });

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{props.children}</ThemeContext.Provider>
  );
};

/**
 * 현재 테마와 테마 변경 함수에 접근하는 훅
 *
 * @returns 테마 상태 객체
 *   - `theme`: 현재 테마 Signal ("light" | "dark")
 *   - `setTheme`: 테마 변경 함수
 * @throws ThemeProvider 외부에서 호출 시 에러 발생
 *
 * @example
 * ```tsx
 * const { theme, setTheme } = useTheme();
 *
 * return (
 *   <button onClick={() => setTheme(theme() === "light" ? "dark" : "light")}>
 *     현재: {theme()}
 *   </button>
 * );
 * ```
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "[useTheme] ThemeProvider 내부에서 사용해야 합니다.\n" +
        "ThemeProvider는 ConfigProvider 내부에 배치되어야 합니다.\n" +
        "예: <ConfigProvider><ThemeProvider>...</ThemeProvider></ConfigProvider>",
    );
  }
  return ctx;
}
