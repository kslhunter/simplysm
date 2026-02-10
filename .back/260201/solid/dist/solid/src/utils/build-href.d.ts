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
export declare function buildHref(path: string): string;
//# sourceMappingURL=build-href.d.ts.map
