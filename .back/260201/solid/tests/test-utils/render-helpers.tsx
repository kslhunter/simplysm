import { render as solidRender, type BoundFunctions, type queries } from "@solidjs/testing-library";
import { type Component } from "solid-js";
import { ConfigProvider } from "../../src/contexts/ConfigContext";

/**
 * solidRender의 반환 타입 (prettyFormat 의존성 문제 회피)
 */
type RenderResult = BoundFunctions<typeof queries> & {
  asFragment: () => string;
  container: HTMLElement;
  baseElement: HTMLElement;
  debug: (baseElement?: HTMLElement | HTMLElement[], maxLength?: number) => void;
  unmount: () => void;
};

/**
 * ConfigProvider로 감싸서 렌더링하는 헬퍼
 * useLocalStorage 등 ConfigProvider에 의존하는 컴포넌트 테스트에 사용
 */
export function renderWithConfig(
  ui: () => ReturnType<Component>,
  options?: { clientName?: string },
): RenderResult {
  const clientName = options?.clientName ?? "test-app";

  return solidRender(() => <ConfigProvider staticClientName={clientName}>{ui()}</ConfigProvider>);
}

/**
 * localStorage를 초기화하는 헬퍼
 */
export function clearLocalStorage() {
  localStorage.clear();
}
