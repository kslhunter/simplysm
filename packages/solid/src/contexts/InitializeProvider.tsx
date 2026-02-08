import type { ParentComponent } from "solid-js";
import { type AppConfig, ConfigContext } from "./ConfigContext";
import { useClipboardValueCopy } from "./useClipboardValueCopy";

/**
 * @simplysm/solid 초기화 Provider
 *
 * @remarks
 * 앱 루트에서 한 번 감싸며, 다음을 초기화한다:
 * - 앱 전역 설정 (config) Context 제공
 * - 폼 컨트롤 value 클립보드 복사 지원
 *
 * @example
 * ```tsx
 * <InitializeProvider config={{ clientName: "myApp" }}>
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 * </InitializeProvider>
 * ```
 */
export const InitializeProvider: ParentComponent<{ config: AppConfig }> = (props) => {
  // 폼 컨트롤 value 클립보드 복사
  useClipboardValueCopy();

  // eslint-disable-next-line solid/reactivity -- config는 초기 설정값으로 변경되지 않음
  return <ConfigContext.Provider value={props.config}>{props.children}</ConfigContext.Provider>;
};
