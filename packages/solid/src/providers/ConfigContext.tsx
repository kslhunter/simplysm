import { createContext, useContext, type ParentComponent } from "solid-js";

/**
 * App-wide configuration.
 */
export interface AppConfig {
  /**
   * Client identifier (used as storage key prefix)
   */
  clientName: string;
}

/**
 * App-wide configuration Context.
 */
export const ConfigContext = createContext<AppConfig>();

/**
 * Hook to access app-wide configuration.
 *
 * @throws Throws an error if ConfigProvider is not present
 */
export function useConfig(): AppConfig {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig는 ConfigProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}

/**
 * App-wide configuration Provider.
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
    // eslint-disable-next-line solid/reactivity -- clientName is an initial config value that does not change
    <ConfigContext.Provider value={{ clientName: props.clientName }}>
      {props.children}
    </ConfigContext.Provider>
  );
};
