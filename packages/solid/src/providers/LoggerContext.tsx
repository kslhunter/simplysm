import { createContext, useContext, type ParentComponent } from "solid-js";

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
 * 로그 어댑터 Context
 *
 * @remarks
 * Provider가 없으면 `undefined` (useLogger에서 consola로 fallback)
 */
export const LoggerContext = createContext<LogAdapter | undefined>(undefined);

/**
 * 로그 어댑터 Context에 접근하는 훅
 *
 * @returns LogAdapter 또는 undefined (Provider가 없으면)
 */
export function useLogAdapter(): LogAdapter | undefined {
  return useContext(LoggerContext);
}

/**
 * 로그 어댑터 Provider
 *
 * @example
 * ```tsx
 * <LoggerProvider adapter={myLogAdapter}>
 *   <App />
 * </LoggerProvider>
 * ```
 */
export const LoggerProvider: ParentComponent<{ adapter: LogAdapter }> = (props) => {
  return (
    // eslint-disable-next-line solid/reactivity -- adapter는 초기 설정값으로 변경되지 않음
    <LoggerContext.Provider value={props.adapter}>{props.children}</LoggerContext.Provider>
  );
};
