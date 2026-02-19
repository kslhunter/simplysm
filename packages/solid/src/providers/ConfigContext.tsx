import { createContext, useContext, type ParentComponent } from "solid-js";

/**
 * 앱 전역 설정
 */
export interface AppConfig {
  /**
   * 클라이언트 식별자 (저장소 key prefix로 사용)
   */
  clientName: string;
}

/**
 * 앱 전역 설정 Context
 */
export const ConfigContext = createContext<AppConfig>();

/**
 * 앱 전역 설정에 접근하는 훅
 *
 * @throws ConfigProvider가 없으면 에러 발생
 */
export function useConfig(): AppConfig {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig는 ConfigProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}

/**
 * 앱 전역 설정 Provider
 *
 * @example
 * ```tsx
 * <ConfigProvider clientName="myApp">
 *   <App />
 * </ConfigProvider>
 * ```
 */
export const ConfigProvider: ParentComponent<{ clientName: string }> = (props) => {
  return (
    // eslint-disable-next-line solid/reactivity -- clientName은 초기 설정값으로 변경되지 않음
    <ConfigContext.Provider value={{ clientName: props.clientName }}>
      {props.children}
    </ConfigContext.Provider>
  );
};
