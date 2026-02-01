/**
 * SolidJS Router의 HashRouter/BrowserRouter를 자동 감지하여 올바른 href를 생성한다.
 *
 * @param path - 라우터 경로 (예: "/home", "/settings")
 * @returns 전체 URL (HashRouter: "origin/#/path", BrowserRouter: "origin/path")
 *
 * @example
 * ```ts
 * // HashRouter 환경 (예: http://example.com/#/home)
 * buildHref("/settings"); // "http://example.com/#/settings"
 *
 * // BrowserRouter 환경 (예: http://example.com/home)
 * buildHref("/settings"); // "http://example.com/settings"
 * ```
 */
export function buildHref(path: string): string {
  // HashRouter는 hash가 "/" 경로를 포함함 (예: #/, #/home, #/settings)
  // 일반 앵커 링크는 "/"로 시작하지 않음 (예: #section, #top)
  // hash가 "#/"만 있는 경우도 HashRouter로 처리 (루트 경로)
  const hash = window.location.hash;
  const isHashRouter = hash === "#/" || hash.startsWith("#/");

  if (isHashRouter) {
    // hash 이전의 기본 URL (origin + pathname + search)
    const baseUrl = window.location.origin + window.location.pathname + window.location.search;
    return `${baseUrl}#${path}`;
  }

  return new URL(path, window.location.origin).href;
}
