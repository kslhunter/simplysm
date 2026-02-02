import { createSignal, type Accessor, type Setter } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { jsonStringify, jsonParse } from "@simplysm/core-common";
import { useConfig } from "./ConfigContext";

/**
 * clientName prefix가 적용된 localStorage 훅
 *
 * @remarks
 * - ConfigContext.Provider 내부에서만 사용 가능
 * - 키는 자동으로 `{clientName}.{key}` 형태로 저장됨
 * - 반응형 동기화 지원 (Signal 변경 시 자동 저장)
 * - DateTime, DateOnly, Time, Uuid 등 커스텀 타입 직렬화 지원
 *
 * @example
 * ```tsx
 * // Provider 설정
 * <ConfigContext.Provider value={{ clientName: "myApp" }}>
 *   <App />
 * </ConfigContext.Provider>
 *
 * // 컴포넌트에서 사용
 * const [theme, setTheme] = usePersisted("theme", "light");
 * // localStorage에 "myApp.theme" 키로 저장됨
 *
 * setTheme("dark"); // 자동으로 localStorage에 저장
 * console.log(theme()); // "dark"
 * ```
 *
 * @param key - 저장소 키 (clientName prefix가 자동 적용됨)
 * @param initialValue - 초기값 (저장된 값이 없을 때 사용)
 * @returns [getter, setter] 튜플
 */
export function usePersisted<T>(key: string, initialValue: T): [Accessor<T>, Setter<T>] {
  const config = useConfig();
  const prefixedKey = `${config.clientName}.${key}`;

  // eslint-disable-next-line solid/reactivity -- makePersisted는 signal 튜플을 직접 받도록 설계됨
  const [value, setValue] = makePersisted(createSignal<T>(initialValue), {
    name: prefixedKey,
    storage: localStorage,
    serialize: (v) => jsonStringify(v),
    deserialize: (v) => jsonParse<T>(v),
  });

  return [value, setValue];
}
