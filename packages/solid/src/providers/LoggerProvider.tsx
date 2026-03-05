import { type Accessor, createContext, createSignal, type ParentComponent } from "solid-js";
import { consola } from "consola";

/**
 * Log adapter interface.
 *
 * @remarks
 * - Log transport adapter used by `useLogger` (DB, server, etc.)
 * - When an adapter is set, only the adapter is used instead of consola
 */
export interface LogAdapter {
  write(severity: "error" | "warn" | "info" | "log", ...data: any[]): Promise<void> | void;
}

const defaultLogAdapter: LogAdapter = {
  write: (severity, ...data) => (consola as any)[severity](...data),
};

/**
 * Logger context value.
 *
 * @remarks
 * - `adapter`: Currently configured LogAdapter (signal). Defaults to consola-based adapter
 * - `configure`: Function that sets/chains adapter via decorator function
 */
export interface LoggerContextValue {
  adapter: Accessor<LogAdapter>;
  configure: (fn: (origin: LogAdapter) => LogAdapter) => void;
}

/**
 * Log adapter Context.
 *
 * @remarks
 * Returns `undefined` without Provider (useLogger uses consola default adapter)
 */
export const LoggerContext = createContext<LoggerContextValue>();

/**
 * Log adapter Provider.
 *
 * @remarks
 * - Used without props. Adapter is injected later via `useLogger().configure()`
 * - Defaults to consola-based adapter
 * - configure accepts a decorator function to wrap or replace the existing adapter
 *
 * @example
 * ```tsx
 * <LoggerProvider>
 *   <App />
 * </LoggerProvider>
 *
 * // Configure with a decorator in a child component:
 * useLogger().configure((origin) => ({
 *   write: (...args) => {
 *     origin.write(...args);
 *     sendToServer(...args);
 *   },
 * }));
 * ```
 */
export const LoggerProvider: ParentComponent = (props) => {
  const [adapter, setAdapter] = createSignal<LogAdapter>(defaultLogAdapter);

  const value: LoggerContextValue = {
    adapter,
    configure: (fn: (origin: LogAdapter) => LogAdapter) => setAdapter((prev) => fn(prev)),
  };

  return <LoggerContext.Provider value={value}>{props.children}</LoggerContext.Provider>;
};
