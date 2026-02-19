import {
  type Accessor,
  createContext,
  createSignal,
  useContext,
  type ParentComponent,
} from "solid-js";

/**
 * 로그 어댑터 인터페이스
 *
 * @remarks
 * - `useLogger`에서 사용하는 로그 전송 어댑터 (DB, 서버 등)
 * - adapter가 설정되면 consola 대신 adapter만 사용됨
 */
export interface LogAdapter {
  write(severity: "error" | "warn" | "info" | "log", ...data: any[]): Promise<void> | void;
}

/**
 * 로그 어댑터 Context 값
 *
 * @remarks
 * - `adapter`: 현재 설정된 LogAdapter (signal). configure 전에는 undefined
 * - `configure`: adapter를 나중에 주입하는 함수
 */
export interface LoggerContextValue {
  adapter: Accessor<LogAdapter | undefined>;
  configure: (adapter: LogAdapter) => void;
}

/**
 * 로그 어댑터 Context
 *
 * @remarks
 * Provider가 없으면 `undefined` (useLogger에서 consola로 fallback)
 */
export const LoggerContext = createContext<LoggerContextValue>();

/**
 * 로그 어댑터 Context에 접근하는 훅
 *
 * @returns LoggerContextValue 또는 undefined (Provider가 없으면)
 */
export function useLogAdapter(): LoggerContextValue | undefined {
  return useContext(LoggerContext);
}

/**
 * 로그 어댑터 Provider
 *
 * @remarks
 * - prop 없이 사용. adapter는 `useLogger().configure()`로 나중에 주입
 * - configure 전에는 useLogger가 consola로 fallback
 *
 * @example
 * ```tsx
 * <LoggerProvider>
 *   <App />
 * </LoggerProvider>
 *
 * // 자식 컴포넌트에서 나중에 설정:
 * useLogger().configure(myLogAdapter);
 * ```
 */
export const LoggerProvider: ParentComponent = (props) => {
  const [adapter, setAdapter] = createSignal<LogAdapter | undefined>();

  const value: LoggerContextValue = {
    adapter,
    configure: (a: LogAdapter) => setAdapter(() => a),
  };

  return <LoggerContext.Provider value={value}>{props.children}</LoggerContext.Provider>;
};
