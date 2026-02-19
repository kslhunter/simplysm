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
 * 동기화 저장소 Context 값
 *
 * @remarks
 * - `adapter`: 현재 설정된 StorageAdapter (signal). configure 전에는 undefined
 * - `configure`: adapter를 나중에 주입하는 함수
 */
export interface SyncStorageContextValue {
  adapter: Accessor<StorageAdapter | undefined>;
  configure: (adapter: StorageAdapter) => void;
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
 * - prop 없이 사용. adapter는 `useSyncStorage().configure()`로 나중에 주입
 * - configure 전에는 useSyncConfig이 localStorage로 fallback
 *
 * @example
 * ```tsx
 * <SyncStorageProvider>
 *   <App />
 * </SyncStorageProvider>
 *
 * // 자식 컴포넌트에서 나중에 설정:
 * useSyncStorage()!.configure(myStorageAdapter);
 * ```
 */
export const SyncStorageProvider: ParentComponent = (props) => {
  const [adapter, setAdapter] = createSignal<StorageAdapter | undefined>();

  const value: SyncStorageContextValue = {
    adapter,
    configure: (a: StorageAdapter) => setAdapter(() => a),
  };

  return <SyncStorageContext.Provider value={value}>{props.children}</SyncStorageContext.Provider>;
};
