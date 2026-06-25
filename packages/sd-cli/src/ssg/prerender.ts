import { fsx } from "@simplysm/core-node";
import path from "path";
import { pathToFileURL } from "node:url";
import { createLogger, err as errNs } from "@simplysm/core-common";

const logger = createLogger("sd:cli:ssg:prerender");

export interface PrerenderOptions {
  /** buildSsrBundle로 생성된 server 번들 경로 */
  bundlePath: string;
  /** 프리렌더할 라우트 경로 목록 (예: ["/", "/about"]) */
  routes: string[];
  /** 렌더 기준 문서 (SPA 셸 index.html 내용) */
  documentHtml: string;
  /** base 경로 (예: "/my-client/") — 렌더 URL 구성에 사용 */
  basePath: string;
  /** HTML 출력 디렉토리 (dist/) */
  outdir: string;
}

interface SsrBundleModule {
  render(url: string, document: string): Promise<string>;
}

/**
 * server 번들로 라우트별 HTML을 생성해 outdir에 기록한다.
 *
 * 라우트 1건이라도 실패하면 throw (빌드 전체 실패 — 부분 산출 금지).
 */
export async function prerenderRoutes(options: PrerenderOptions): Promise<void> {
  const bundleModule = (await import(
    pathToFileURL(options.bundlePath).href
  )) as SsrBundleModule;

  // 1. 전체 라우트 렌더 (전부 성공해야 기록 단계로 진행)
  const rendered: { route: string; html: string }[] = [];
  for (const route of options.routes) {
    const normalizedRoute = normalizeRoute(route);
    const url = path.posix.join(options.basePath, normalizedRoute);
    logger.debug(`프리렌더: ${url}`);
    try {
      const html = await bundleModule.render(url, options.documentHtml);
      rendered.push({ route: normalizedRoute, html });
    } catch (err) {
      throw new Error(`프리렌더 실패 (라우트: ${route}): ${errNs.message(err)}`, {
        cause: err,
      });
    }
  }

  // 2. 라우트별 <경로>/index.html 기록 ("/"는 index.html)
  for (const { route, html } of rendered) {
    const htmlPath = path.join(options.outdir, route, "index.html");
    fsx.writeSync(htmlPath, html);
  }
}

/** 라우트 경로 정규화: 선행 "/" 제거 ("/" → "") */
function normalizeRoute(route: string): string {
  if (!route.startsWith("/")) {
    throw new Error(`프리렌더 라우트는 "/"로 시작해야 합니다: "${route}"`);
  }
  return route.replace(/^\/+/, "").replace(/\/+$/, "");
}
