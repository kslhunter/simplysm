import { type ParentComponent } from "solid-js";
declare const themeClassMap: {
    readonly light: string;
    readonly dark: string;
};
type ThemeKey = keyof typeof themeClassMap;
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
export declare const ThemeProvider: ParentComponent;
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
export declare function useTheme(): {
    theme: () => ThemeKey;
    setTheme: (t: ThemeKey) => void;
};
export {};
//# sourceMappingURL=ThemeContext.d.ts.map