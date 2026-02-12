import { createSignal, type Accessor, type Setter } from "solid-js";
import { makePersisted, type AsyncStorage, type SyncStorage } from "@solid-primitives/storage";
import { jsonStringify, jsonParse } from "@simplysm/core-common";
import { useConfig } from "../providers/ConfigContext";

/**
 * clientName prefix가 적용된 영속 저장소 훅
 *
 * @remarks
 * - ConfigContext.Provider 내부에서만 사용 가능
 * - 키는 자동으로 `{clientName}.{key}` 형태로 저장됨
 * - 반응형 동기화 지원 (Signal 변경 시 자동 저장)
 * - DateTime, DateOnly, Time, Uuid 등 커스텀 타입 직렬화 지원
 * - 비동기 저장소 사용 시 세 번째 반환값 `loading`으로 초기 로드 상태 확인 가능
 *
 * @example
 * ```tsx
 * // 기본 사용 (localStorage)
 * const [theme, setTheme, loading] = usePersisted("theme", "light");
 *
 * // loading 무시 (기존 호환)
 * const [theme, setTheme] = usePersisted("theme", "light");
 * ```
 *
 * @param key - 저장소 키 (clientName prefix가 자동 적용됨)
 * @param initialValue - 초기값 (저장된 값이 없을 때 사용)
 * @returns [getter, setter, loading] 튜플
 */
export function usePersisted<T>(key: string, initialValue: T): [Accessor<T>, Setter<T>, Accessor<boolean>] {
  const config = useConfig();
  const prefixedKey = `${config.clientName}.${key}`;
  const storage = config.syncStorage ?? localStorage;

  // eslint-disable-next-line solid/reactivity -- makePersisted는 signal 튜플을 직접 받도록 설계됨
  const [value, setValue, init] = makePersisted(createSignal<T>(initialValue), {
    name: prefixedKey,
    storage: storage as SyncStorage | AsyncStorage,
    serialize: (v) => jsonStringify(v),
    deserialize: (v) => jsonParse<T>(v),
  });

  // init이 Promise이면 비동기 저장소 → loading 추적
  const isAsync = init instanceof Promise;
  const [loading, setLoading] = createSignal(isAsync);

  if (isAsync) {
    void init.then(() => setLoading(false));
  }

  return [value, setValue, loading];
}
