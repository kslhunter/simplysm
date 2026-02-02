import { createContext, useContext } from "solid-js";

/**
 * 앱 전역 설정
 */
export interface AppConfig {
  /**
   * 클라이언트 식별자 (localStorage key prefix로 사용)
   */
  clientName: string;
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
