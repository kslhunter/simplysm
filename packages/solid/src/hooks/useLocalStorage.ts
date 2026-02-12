import { type Accessor, type Setter, createSignal } from "solid-js";
import { useConfig } from "../providers/ConfigContext";

/**
 * localStorage 기반 저장소 훅.
 * syncStorage 설정과 무관하게 항상 localStorage를 사용한다.
 * 기기별로 독립적으로 유지되어야 하는 데이터(인증 토큰, 기기별 상태 등)에 사용한다.
 *
 * 키는 ConfigContext의 `clientName`으로 자동 prefix된다. (`${clientName}.${key}`)
 *
 * @template T - 저장할 값의 타입
 * @param key - localStorage 키
 * @param initialValue - 초기값 (옵셔널)
 * @returns [Accessor<T | undefined>, Setter<T | undefined>] 튜플
 *
 * @example
 * ```tsx
 * const [token, setToken] = useLocalStorage<string>("auth-token");
 *
 * // 값 설정
 * setToken("abc123");
 *
 * // 값 읽기
 * console.log(token()); // "abc123"
 *
 * // 값 제거
 * setToken(undefined);
 * ```
 */
export function useLocalStorage<T>(key: string, initialValue?: T): [Accessor<T | undefined>, Setter<T | undefined>] {
  const config = useConfig();
  const prefixedKey = `${config.clientName}.${key}`;

  // localStorage에서 초기값 읽기
  let storedValue: T | undefined = initialValue;
  try {
    const item = localStorage.getItem(prefixedKey);
    if (item !== null) {
      storedValue = JSON.parse(item) as T;
    }
  } catch {
    // JSON 파싱 실패 시 초기값 사용
  }

  const [value, setValue] = createSignal<T | undefined>(storedValue);

  const setAndStore = (newValue: T | undefined | ((prev: T | undefined) => T | undefined)) => {
    let resolved: T | undefined;

    if (typeof newValue === "function") {
      resolved = (newValue as (prev: T | undefined) => T | undefined)(value());
      setValue(() => resolved);
    } else {
      resolved = newValue;
      setValue(() => newValue);
    }

    if (resolved === undefined) {
      localStorage.removeItem(prefixedKey);
    } else {
      localStorage.setItem(prefixedKey, JSON.stringify(resolved));
    }

    return resolved;
  };

  return [value, setAndStore as Setter<T | undefined>];
}
