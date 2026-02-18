import {
  createContext,
  useContext,
  type ParentComponent,
  createMemo,
  createEffect,
  onCleanup,
} from "solid-js";
import { createMediaQuery } from "@solid-primitives/media";
import { useSyncConfig } from "../hooks/useSyncConfig";

/**
 * 테마 모드
 * - `light`: 라이트 모드
 * - `dark`: 다크 모드
 * - `system`: 시스템 설정 따름
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * 실제 적용되는 테마 (system일 때 OS 설정에 따라 결정)
 */
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** 현재 테마 모드 (사용자 선택값) */
  mode: () => ThemeMode;
  /** 테마 모드 설정 */
  setMode: (mode: ThemeMode) => void;
  /** 실제 적용되는 테마 (system일 때 OS 설정 따름) */
  resolvedTheme: () => ResolvedTheme;
  /** 다음 모드로 순환 (light → system → dark → light) */
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>();

/**
 * 테마 Context에 접근하는 훅
 *
 * @throws ThemeProvider가 없으면 에러 발생
 *
 * @example
 * ```tsx
 * const { mode, setMode, resolvedTheme, cycleMode } = useTheme();
 *
 * // 현재 모드 확인
 * console.log(mode()); // "light" | "dark" | "system"
 *
 * // 실제 적용 테마 확인
 * console.log(resolvedTheme()); // "light" | "dark"
 *
 * // 모드 변경
 * setMode("dark");
 *
 * // 순환 (토글 버튼용)
 * cycleMode(); // light → system → dark → light
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error(
      "useTheme는 ThemeProvider 내부에서만 사용할 수 있습니다. ThemeProvider는 InitializeProvider 아래에 위치해야 합니다",
    );
  }
  return context;
}

/**
 * 테마 Provider 컴포넌트
 *
 * @remarks
 * - ConfigContext.Provider 내부에서 사용해야 함 (useSyncConfig 의존)
 * - localStorage에 테마 설정 저장
 * - `<html>` 요소에 `dark` 클래스 자동 토글
 *
 * @example
 * ```tsx
 * <ConfigContext.Provider value={{ clientName: "myApp" }}>
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 * </ConfigContext.Provider>
 * ```
 */
export const ThemeProvider: ParentComponent = (props) => {
  const [mode, setMode, ready] = useSyncConfig<ThemeMode>("theme", "system");

  // OS 다크모드 감지
  const prefersDark = createMediaQuery("(prefers-color-scheme: dark)");

  // 실제 적용 테마 계산
  const resolvedTheme = createMemo<ResolvedTheme>(() => {
    const currentMode = mode();
    if (currentMode === "system") {
      return prefersDark() ? "dark" : "light";
    }
    return currentMode;
  });

  // 다음 모드로 순환
  const cycleMode = () => {
    const current = mode();
    const next: ThemeMode =
      current === "light" ? "system" : current === "system" ? "dark" : "light";
    setMode(next);
  };

  // <html>에 dark 클래스 토글
  createEffect(() => {
    if (!ready()) return; // Don't apply theme until storage has been read
    const isDark = resolvedTheme() === "dark";
    document.documentElement.classList.toggle("dark", isDark);
  });

  // cleanup 시 dark 클래스 제거
  onCleanup(() => {
    document.documentElement.classList.remove("dark");
  });

  const contextValue: ThemeContextValue = {
    mode,
    setMode,
    resolvedTheme,
    cycleMode,
  };

  return <ThemeContext.Provider value={contextValue}>{props.children}</ThemeContext.Provider>;
};
