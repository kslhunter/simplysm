import { createContext, useContext, type ParentComponent } from "solid-js";

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
 * 동기화 저장소 Context
 *
 * @remarks
 * Provider가 없으면 `undefined` (useSyncConfig에서 localStorage로 fallback)
 */
export const SyncStorageContext = createContext<StorageAdapter | undefined>(undefined);

/**
 * 동기화 저장소 Context에 접근하는 훅
 *
 * @returns StorageAdapter 또는 undefined (Provider가 없으면)
 */
export function useSyncStorage(): StorageAdapter | undefined {
  return useContext(SyncStorageContext);
}

/**
 * 동기화 저장소 Provider
 *
 * @example
 * ```tsx
 * <SyncStorageProvider storage={myStorageAdapter}>
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 * </SyncStorageProvider>
 * ```
 */
export const SyncStorageProvider: ParentComponent<{ storage: StorageAdapter }> = (props) => {
  return (
    // eslint-disable-next-line solid/reactivity -- storage는 초기 설정값으로 변경되지 않음
    <SyncStorageContext.Provider value={props.storage}>
      {props.children}
    </SyncStorageContext.Provider>
  );
};
