import { type Signal } from "solid-js";
/**
 * useLocalStorage 옵션
 */
export interface UseLocalStorageOptions {
  /**
   * localStorage에서 읽은 값을 검증하는 함수
   * false를 반환하면 defaultValue가 사용된다
   */
  validator?: (value: string) => boolean;
}
/**
 * localStorage와 동기화되는 Signal을 생성하는 훅
 *
 * ConfigProvider의 clientName을 prefix로 사용하여 키 충돌을 방지한다.
 * 값이 변경될 때마다 자동으로 localStorage에 저장된다.
 *
 * @typeParam T - 저장할 값의 타입 (string의 서브타입이어야 함)
 * @param key - localStorage 키 (clientName이 prefix로 붙음)
 * @param defaultValue - localStorage에 값이 없거나 유효하지 않을 때 사용할 기본값
 * @param options - 선택적 옵션 (validator 등)
 * @returns SolidJS Signal 튜플 [getter, setter]
 *
 * @example
 * ```tsx
 * // 기본 사용법
 * const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");
 *
 * // validator를 사용한 타입 안전한 사용법
 * const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light", {
 *   validator: (v) => v === "light" || v === "dark",
 * });
 *
 * // 값 읽기
 * console.log(theme()); // "light" 또는 저장된 값
 *
 * // 값 설정 (자동으로 localStorage에 저장)
 * setTheme("dark");
 * ```
 */
export declare function useLocalStorage<T extends string>(
  key: string,
  defaultValue: T,
  options?: UseLocalStorageOptions,
): Signal<T>;
//# sourceMappingURL=useLocalStorage.d.ts.map
