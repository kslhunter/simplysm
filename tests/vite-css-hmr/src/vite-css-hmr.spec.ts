import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_DIR = path.resolve(__dirname, "..", "fixture");
const STYLE_CSS_PATH = path.join(FIXTURE_DIR, "lib-dist", "style.css");

/** PostCSS 마커 플러그인: CSS에 /* postcss-applied *​/ 주석 삽입 */
function testMarkerPlugin() {
  return {
    postcssPlugin: "test-marker",
    Once(root: any) {
      root.prepend({ text: "postcss-applied" });
    },
  };
}

describe("Vite CSS HMR + PostCSS 통합 테스트", () => {
  let server: ViteDevServer;
  let originalCss: string;

  beforeAll(async () => {
    // fixture의 원본 CSS 백업
    originalCss = fs.readFileSync(STYLE_CSS_PATH, "utf-8");

    server = await createServer({
      root: FIXTURE_DIR,
      logLevel: "silent",
      server: {
        middlewareMode: true,
      },
      css: {
        postcss: {
          plugins: [testMarkerPlugin()],
        },
      },
      optimizeDeps: {
        noDiscovery: true,
      },
    });
  });

  afterAll(async () => {
    // fixture CSS 원복
    fs.writeFileSync(STYLE_CSS_PATH, originalCss);
    await server.close();
  });

  // Unit: CSS 파일이 side-effect import를 통해 module graph에 등록된다
  it("registers CSS file in module graph when imported via side-effect JS", async () => {
    // JS를 통해 CSS가 간접 import된 경우에도 CSS가 module graph에 등록되는지 확인
    // (main.js → lib-dist/index.js → lib-dist/style.css)
    await server.transformRequest("/lib-dist/style.css");

    const modules = server.moduleGraph.getModulesByFile(
      STYLE_CSS_PATH.replace(/\\/g, "/"),
    );
    expect(modules).toBeDefined();
    expect(modules!.size).toBeGreaterThan(0);
  });

  // Unit: PostCSS가 적용되어도 원본 CSS 선언이 보존된다
  it("preserves original CSS declarations after PostCSS processing", async () => {
    const result = await server.transformRequest("/lib-dist/style.css");
    expect(result).not.toBeNull();
    // 원본 CSS의 .sd-flex 선언이 PostCSS 처리 후에도 보존되어야 한다
    expect(result!.code).toContain("display: flex");
    expect(result!.code).toContain(".sd-flex");
  });

  // Scenario: css.postcss 설정의 PostCSS 플러그인이 side-effect CSS에 적용된다
  it("applies PostCSS plugins to side-effect imported CSS via transformRequest", async () => {
    // Vite transformRequest로 CSS 모듈 요청
    const result = await server.transformRequest("/lib-dist/style.css");

    expect(result).not.toBeNull();
    // PostCSS test-marker 플러그인이 적용되어 "postcss-applied" 마커가 포함되어야 한다
    expect(result!.code).toContain("postcss-applied");
  });

  // Scenario: SCSS 변경으로 dist CSS 갱신 시 Client CSS가 HMR으로 업데이트된다
  it("invalidates CSS module in module graph when CSS file changes (HMR precondition)", async () => {
    // 먼저 CSS를 로드하여 module graph에 등록
    await server.transformRequest("/lib-dist/style.css");

    const modulesBeforeChange = server.moduleGraph.getModulesByFile(
      STYLE_CSS_PATH.replace(/\\/g, "/"),
    );
    expect(modulesBeforeChange).toBeDefined();
    expect(modulesBeforeChange!.size).toBeGreaterThan(0);

    // CSS 파일 변경
    fs.writeFileSync(STYLE_CSS_PATH, ".sd-flex { display: inline-flex; }\n");

    // Vite watcher에 change 이벤트 발행 (sdScopeWatchPlugin이 실제로 하는 동작)
    server.watcher.emit("change", STYLE_CSS_PATH);

    // module graph 무효화 확인: Vite는 watcher change 이벤트를 받으면
    // handleHMRUpdate를 호출하여 module graph를 무효화한다.
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    // 무효화 확인: client 환경의 모듈에서 transformResult가 null이 된다
    const modulesAfterChange = server.moduleGraph.getModulesByFile(
      STYLE_CSS_PATH.replace(/\\/g, "/"),
    );
    expect(modulesAfterChange).toBeDefined();
    const clientModule = [...modulesAfterChange!][0] as any;
    expect(clientModule._clientModule.transformResult).toBeNull();

    // 변경 후 다시 transform하면 새 내용이 반영된다
    const newResult = await server.transformRequest("/lib-dist/style.css");
    expect(newResult).not.toBeNull();
    expect(newResult!.code).toContain("inline-flex");
    // PostCSS도 여전히 적용된다
    expect(newResult!.code).toContain("postcss-applied");
  });

  // Scenario: CSS-only 변경 시에도 HMR이 동작한다
  it("triggers HMR for CSS-only changes (no JS changes needed)", async () => {
    // CSS 원복 후 다시 로드
    fs.writeFileSync(STYLE_CSS_PATH, ".sd-flex { display: flex; }\n");
    server.watcher.emit("change", STYLE_CSS_PATH);
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    // CSS를 로드하여 module graph에 등록
    await server.transformRequest("/lib-dist/style.css");

    // hot.send 호출 감시
    const hmrMessages: { type?: string; updates?: { type?: string; path?: string }[] }[][] = [];
    const originalSend = server.hot.send.bind(server.hot);
    server.hot.send = (...args: any[]) => {
      hmrMessages.push(args);
      return (originalSend as any)(...args);
    };

    // CSS만 변경 (JS 파일 변경 없음)
    fs.writeFileSync(STYLE_CSS_PATH, ".sd-flex { display: grid; }\n");
    server.watcher.emit("change", STYLE_CSS_PATH);

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    // HMR 메시지가 전송되었는지 확인 (css-update 또는 update 타입)
    const cssHmrMessage = hmrMessages.find(
      (args) =>
        args[0]?.type === "update" &&
        args[0]?.updates?.some(
          (u) => u.type === "css-update" || u.path?.endsWith(".css"),
        ),
    );

    expect(cssHmrMessage).toBeDefined();

    // server.hot.send 복원
    server.hot.send = originalSend;
  });
});
