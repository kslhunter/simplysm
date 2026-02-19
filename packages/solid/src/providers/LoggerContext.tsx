import {
  type Accessor,
  createContext,
  createSignal,
  useContext,
  type ParentComponent,
} from "solid-js";
import { consola } from "consola";

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

const defaultLogAdapter: LogAdapter = {
  write: (severity, ...data) => (consola as any)[severity](...data),
};

/**
 * 로그 어댑터 Context 값
 *
 * @remarks
 * - `adapter`: 현재 설정된 LogAdapter (signal). 기본값은 consola 기반 adapter
 * - `configure`: decorator function으로 adapter를 설정/체이닝하는 함수
 */
export interface LoggerContextValue {
  adapter: Accessor<LogAdapter>;
  configure: (fn: (origin: LogAdapter) => LogAdapter) => void;
}

/**
 * 로그 어댑터 Context
 *
 * @remarks
 * Provider가 없으면 `undefined` (useLogger에서 consola 기본 adapter 사용)
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
 * - 기본값은 consola 기반 adapter
 * - configure는 decorator function을 받아 기존 adapter를 감싸거나 교체
 *
 * @example
 * ```tsx
 * <LoggerProvider>
 *   <App />
 * </LoggerProvider>
 *
 * // 자식 컴포넌트에서 decorator로 설정:
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
