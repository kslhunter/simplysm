import { createContext, useContext } from "solid-js";

/**
 * 커스텀 저장소 어댑터 인터페이스
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
 * 앱 전역 설정
 */
export interface AppConfig {
  /**
   * 클라이언트 식별자 (저장소 key prefix로 사용)
   */
  clientName: string;

  /**
   * 동기화 가능 저장소 (useSyncConfig에서 사용, 없으면 localStorage로 fallback)
   */
  syncStorage?: StorageAdapter;

  /**
   * 로그 어댑터 (useLogger에서 consola 외 추가 전송에 사용)
   */
  logger?: LogAdapter;

  /**
   * 루트 로딩 오버레이 변형 (기본값: "spinner")
   */
  loadingVariant?: "spinner" | "bar";
}

/**
 * 앱 전역 설정 Context
 *
 * @example
 * ```tsx
 * // 앱 루트에서 Provider 설정
 * <ConfigContext.Provider value={{ clientName: "myApp" }}>
 *   <App />
 * </ConfigContext.Provider>
 *
 * // 컴포넌트에서 사용
 * const config = useConfig();
 * console.log(config.clientName); // "myApp"
 * ```
 */
export const ConfigContext = createContext<AppConfig>();

/**
 * 앱 전역 설정에 접근하는 훅
 *
 * @throws ConfigContext.Provider가 없으면 에러 발생
 */
export function useConfig(): AppConfig {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig는 ConfigContext.Provider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
