import { createContext, type ParentComponent, useContext } from "solid-js";

interface ConfigContextValue {
  clientName: string;
}

const ConfigContext = createContext<ConfigContextValue>();

/**
 * 애플리케이션 전역 설정을 제공하는 Provider
 *
 * localStorage 키 prefix 등에 사용되는 클라이언트 이름을 설정한다.
 *
 * @param props.staticClientName - 클라이언트 식별자 (localStorage 키 prefix로 사용)
 *
 * @example
 * ```tsx
 * <ConfigProvider staticClientName="my-app">
 *   <App />
 * </ConfigProvider>
 * ```
 */
export const ConfigProvider: ParentComponent<{ staticClientName: string }> = (props) => {
  return (
    <ConfigContext.Provider value={{ clientName: props.staticClientName }}>
      {props.children}
    </ConfigContext.Provider>
  );
};

/**
 * ConfigProvider에서 제공하는 설정값에 접근하는 훅
 *
 * @returns clientName을 포함한 설정 객체
 * @throws ConfigProvider 외부에서 호출 시 에러 발생
 *
 * @example
 * ```tsx
 * const { clientName } = useConfig();
 * ```
 */
export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error(
      "[useConfig] ConfigProvider 내부에서 사용해야 합니다.\n" +
        "ConfigProvider는 앱의 루트에 배치되어야 합니다.\n" +
        '예: <ConfigProvider staticClientName="my-app">...</ConfigProvider>',
    );
  }
  return ctx;
}
