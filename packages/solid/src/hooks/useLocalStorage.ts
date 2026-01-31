import { createSignal, onCleanup, type Signal } from "solid-js";
import { useConfig } from "../contexts/ConfigContext";

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
export function useLocalStorage<T extends string>(
  key: string,
  defaultValue: T,
  options?: UseLocalStorageOptions,
): Signal<T> {
  const { clientName } = useConfig();
  const storageKey = `${clientName}:${key}`;

  const getValidatedValue = (): T => {
    try {
      const stored = localStorage.getItem(storageKey);

      // null이거나 빈 문자열이면 기본값 반환
      if (stored == null || stored === "") {
        return defaultValue;
      }

      // validator가 제공되면 검증
      if (options?.validator) {
        return options.validator(stored) ? (stored as T) : defaultValue;
      }

      return stored as T;
    } catch {
      // localStorage 접근 불가 시 (시크릿 모드, iframe sandbox 등) 기본값 반환
      return defaultValue;
    }
  };

  const [value, setValue] = createSignal<T>(getValidatedValue());

  const setAndPersist = ((v: T | ((prev: T) => T)) => {
    const next = typeof v === "function" ? (v as (prev: T) => T)(value()) : v;
    setValue(() => next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // localStorage 접근 불가 시 무시 (값은 메모리에만 유지)
    }
    return next;
  }) as Signal<T>[1];

  // 다른 탭에서 localStorage 변경 시 동기화
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key !== storageKey) return;
    if (e.newValue == null) {
      setValue(() => defaultValue);
    } else if (!options?.validator || options.validator(e.newValue)) {
      setValue(() => e.newValue as T);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageChange);
    onCleanup(() => window.removeEventListener("storage", handleStorageChange));
  }

  return [value, setAndPersist];
}
