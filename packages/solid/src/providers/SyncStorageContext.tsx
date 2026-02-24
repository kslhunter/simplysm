import {
  type Accessor,
  createContext,
  createSignal,
  useContext,
  type ParentComponent,
} from "solid-js";

/**
 * Custom sync storage adapter interface.
 *
 * @remarks
 * - Sync storage: can pass `localStorage`, `sessionStorage`, etc. directly
 * - Async storage: pass an implementation where `getItem` returns a `Promise`
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<unknown>;
  removeItem(key: string): void | Promise<void>;
}

/**
 * Default localStorage-based adapter.
 */
const defaultStorageAdapter: StorageAdapter = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

/**
 * Sync storage context value.
 *
 * @remarks
 * - `adapter`: Currently configured StorageAdapter (signal). Defaults to localStorage-based adapter
 * - `configure`: Function that accepts a decorator function to wrap the existing adapter into a new one
 */
export interface SyncStorageContextValue {
  adapter: Accessor<StorageAdapter>;
  configure: (fn: (origin: StorageAdapter) => StorageAdapter) => void;
}

/**
 * Sync storage Context.
 *
 * @remarks
 * Returns `undefined` without Provider (useSyncConfig falls back to localStorage)
 */
export const SyncStorageContext = createContext<SyncStorageContextValue>();

/**
 * Hook to access the sync storage Context.
 *
 * @returns SyncStorageContextValue or undefined (if Provider is not present)
 */
export function useSyncStorage(): SyncStorageContextValue | undefined {
  return useContext(SyncStorageContext);
}

/**
 * Sync storage Provider.
 *
 * @remarks
 * - Used without props. localStorage-based adapter is set by default
 * - Use `configure()` to pass a decorator function to wrap or replace the existing adapter
 *
 * @example
 * ```tsx
 * <SyncStorageProvider>
 *   <App />
 * </SyncStorageProvider>
 *
 * // Customize adapter with decorator pattern in a child component:
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
