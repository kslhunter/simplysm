import {
  type Accessor,
  createContext,
  createSignal,
  useContext,
  type ParentComponent,
} from "solid-js";

/**
 * 커스텀 동기화 저장소 어댑터 인터페이스
 *
 * @remarks
 * - 동기 저장소: `localStorage`, `sessionStorage` 등 그대로 전달 가능
 * - 비동기 저장소: `getItem`이 `Promise`를 반환하는 구현체 전달
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<unknown>;
  removeItem(key: string): void | Promise<void>;
}

/**
 * 기본 localStorage 기반 어댑터
 */
const defaultStorageAdapter: StorageAdapter = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

/**
 * 동기화 저장소 Context 값
 *
 * @remarks
 * - `adapter`: 현재 설정된 StorageAdapter (signal). 기본값은 localStorage 기반 어댑터
 * - `configure`: decorator 함수를 받아 기존 adapter를 감싸서 새 adapter를 설정하는 함수
 */
export interface SyncStorageContextValue {
  adapter: Accessor<StorageAdapter>;
  configure: (fn: (origin: StorageAdapter) => StorageAdapter) => void;
}

/**
 * 동기화 저장소 Context
 *
 * @remarks
 * Provider가 없으면 `undefined` (useSyncConfig에서 localStorage로 fallback)
 */
export const SyncStorageContext = createContext<SyncStorageContextValue>();

/**
 * 동기화 저장소 Context에 접근하는 훅
 *
 * @returns SyncStorageContextValue 또는 undefined (Provider가 없으면)
 */
export function useSyncStorage(): SyncStorageContextValue | undefined {
  return useContext(SyncStorageContext);
}

/**
 * 동기화 저장소 Provider
 *
 * @remarks
 * - prop 없이 사용. 기본적으로 localStorage 기반 어댑터가 설정됨
 * - `configure()`로 decorator 함수를 전달하여 기존 adapter를 감싸거나 교체 가능
 *
 * @example
 * ```tsx
 * <SyncStorageProvider>
 *   <App />
 * </SyncStorageProvider>
 *
 * // 자식 컴포넌트에서 decorator 패턴으로 adapter 커스터마이징:
 * useSyncStorage()!.configure((origin) => ({
 *   getItem: (key) => myCustomGetItem(key),
 *   setItem: origin.setItem,
 *   removeItem: origin.removeItem,
 * }));
 * ```
 */
export const SyncStorageProvider: ParentComponent = (props) => {
  const [adapter, setAdapter] = createSignal<StorageAdapter>(defaultStorageAdapter);

  const value: SyncStorageContextValue = {
    adapter,
    configure: (fn: (origin: StorageAdapter) => StorageAdapter) => setAdapter((prev) => fn(prev)),
  };

  return <SyncStorageContext.Provider value={value}>{props.children}</SyncStorageContext.Provider>;
};
