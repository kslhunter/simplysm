import { createSignal, onCleanup, type Signal } from "solid-js";
import { useConfig } from "../contexts/ConfigContext";

export interface UseLocalStorageOptions {
  validator?: (value: string) => boolean;
}

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
