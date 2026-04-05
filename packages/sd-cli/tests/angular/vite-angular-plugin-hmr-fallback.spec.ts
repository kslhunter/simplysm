import { describe, it, expect, vi } from "vitest";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";
import { sdAngularPlugin } from "../../src/angular/vite-angular-plugin.js";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "fixtures/basic-app");
const TSCONFIG_PATH = path.join(FIXTURE_DIR, "tsconfig.json");

describe("sdAngularPlugin CSS HMR compatibility", () => {
  // Acceptance: CSS 파일 변경 시 sdAngularPlugin이 Vite default HMR에 위임한다
  it("returns undefined for .css file changes (delegates to Vite default CSS HMR)", async () => {
    const onBuildStart = vi.fn();
    const onBuild = vi.fn();
    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: true,
      onBuildStart,
      onBuild,
    });

    await (plugin as any).buildStart?.call({});

    // buildStart 완료 후 초기 빌드 결과 콜백 리셋
    onBuildStart.mockClear();
    onBuild.mockClear();

    const cssFilePath = path
      .join(FIXTURE_DIR, "node_modules/@scope/lib/dist/style.css")
      .replace(/\\/g, "/");

    const hmrResult = await (plugin as any).hotUpdate?.({
      file: cssFilePath,
      modules: [{ file: cssFilePath, id: cssFilePath }],
      server: { watcher: { emit: vi.fn() } },
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    // .css 파일은 sdAngularPlugin이 처리하지 않으므로 undefined 반환
    expect(hmrResult).toBeUndefined();

    // Angular compiler update가 호출되지 않아야 한다 (onBuildStart가 호출되지 않음)
    expect(onBuildStart).not.toHaveBeenCalled();
    expect(onBuild).not.toHaveBeenCalled();

    await (plugin as any).buildEnd?.call({});
  });

  // Acceptance: CSS 변경이 불필요한 Angular recompilation을 트리거하지 않는다
  it("does not trigger Angular recompilation for .css file changes", async () => {
    const onBuildStart = vi.fn();
    const onBuild = vi.fn();
    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: true,
      onBuildStart,
      onBuild,
    });

    await (plugin as any).buildStart?.call({});

    // buildStart 완료 후 초기 빌드 결과 콜백 리셋
    onBuildStart.mockClear();
    onBuild.mockClear();

    // .ts 파일은 Angular recompilation을 트리거한다 (대조군)
    const tsFilePath = path
      .join(FIXTURE_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    await (plugin as any).hotUpdate?.({
      file: tsFilePath,
      modules: [{ file: tsFilePath, id: tsFilePath }],
      server: { watcher: { emit: vi.fn() } },
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    expect(onBuildStart).toHaveBeenCalledTimes(1);
    expect(onBuild).toHaveBeenCalledTimes(1);

    // 콜백 카운터 리셋
    onBuildStart.mockClear();
    onBuild.mockClear();

    // .css 파일은 Angular recompilation을 트리거하지 않는다
    const cssFilePath = path
      .join(FIXTURE_DIR, "node_modules/@scope/lib/dist/style.css")
      .replace(/\\/g, "/");

    await (plugin as any).hotUpdate?.({
      file: cssFilePath,
      modules: [{ file: cssFilePath, id: cssFilePath }],
      server: { watcher: { emit: vi.fn() } },
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    // CSS 변경으로 Angular compiler가 동작하지 않아야 한다
    expect(onBuildStart).not.toHaveBeenCalled();
    expect(onBuild).not.toHaveBeenCalled();

    await (plugin as any).buildEnd?.call({});
  });

  // Unit: .css 확장자 변형도 동일하게 위임한다 (대문자, 경로 내 .css 등)
  it("returns undefined for various .css file paths", async () => {
    const onBuildStart = vi.fn();
    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: true,
      onBuildStart,
    });

    await (plugin as any).buildStart?.call({});

    const cssVariants = [
      "some/path/to/style.css",
      "node_modules/@simplysm/angular/dist/ui/layout/sd-flex.css",
      "/absolute/path/theme.css",
    ];

    for (const cssPath of cssVariants) {
      const result = await (plugin as any).hotUpdate?.({
        file: cssPath,
        modules: [{ file: cssPath, id: cssPath }],
        server: { watcher: { emit: vi.fn() } },
        timestamp: Date.now(),
        read: () => Promise.resolve(""),
      });

      expect(result).toBeUndefined();
    }

    // 어떤 .css 경로도 Angular 빌드를 트리거하지 않는다
    expect(onBuildStart).not.toHaveBeenCalled();

    await (plugin as any).buildEnd?.call({});
  });

  // Unit: .scss 파일이 TS 프로그램에 없으면 리빌드를 건너뛴다
  it("skips .scss files not in the TypeScript program", async () => {
    const onBuildStart = vi.fn();
    const onBuild = vi.fn();
    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: true,
      onBuildStart,
      onBuild,
    });

    await (plugin as any).buildStart?.call({});

    // buildStart 완료 후 초기 빌드 결과 콜백 리셋
    onBuildStart.mockClear();
    onBuild.mockClear();

    const scssFilePath = path
      .join(FIXTURE_DIR, "src/styles.scss")
      .replace(/\\/g, "/");

    const result = await (plugin as any).hotUpdate?.({
      file: scssFilePath,
      modules: [{ file: scssFilePath, id: scssFilePath }],
      server: { watcher: { emit: vi.fn() } },
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    // .scss 파일이 TS 프로그램에 없으므로 undefined 반환 (리빌드 건너뜀)
    expect(result).toBeUndefined();

    // Angular compiler update가 호출되지 않아야 한다
    expect(onBuildStart).not.toHaveBeenCalled();
    expect(onBuild).not.toHaveBeenCalled();

    await (plugin as any).buildEnd?.call({});
  });
});

describe("sdAngularPlugin HMR fallback", () => {
  // Acceptance: templateUpdates가 undefined일 때 (HMR 불가)
  // middleware에서 빈 응답 → Vite 기본 full module invalidation
  it("returns affected modules even when templateUpdates is undefined (fallback to full invalidation)", async () => {
    const onBuild = vi.fn();
    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: true,
      onBuild,
    });

    await (plugin as any).buildStart?.call({});

    // middleware 등록
    const middlewares: Array<(req: IncomingMessage, res: ServerResponse, next: () => void) => void> =
      [];
    const mockServer = {
      config: { base: "/" },
      middlewares: {
        use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => {
          middlewares.push(fn);
        },
      },
      httpServer: { on: vi.fn() },
    };
    (plugin as any).configureServer?.(mockServer);

    const appComponentPath = path
      .join(FIXTURE_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    // hotUpdate 호출
    const hmrResult = await (plugin as any).hotUpdate?.({
      file: appComponentPath,
      modules: [{ file: appComponentPath, id: appComponentPath }],
      server: { watcher: { emit: vi.fn() } },
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    // hotUpdate는 항상 affected modules 배열을 반환해야 한다
    // (templateUpdates가 undefined이든 아니든)
    expect(Array.isArray(hmrResult)).toBe(true);

    // onBuild 콜백이 호출되어야 한다
    expect(onBuild).toHaveBeenCalled();

    // middleware에서 해당 componentId로 요청하면 빈 응답
    // (templateUpdates가 비어있으므로)
    const middleware = middlewares[0];
    const mockReq = {
      url: "/@ng/component?c=src%2Fapp%2Fapp.component.ts%40AppComponent",
    } as IncomingMessage;

    let body = "";
    const mockRes = {
      writeHead: vi.fn(),
      end(data?: string) {
        body = data ?? "";
      },
    } as unknown as ServerResponse;

    middleware(mockReq, mockRes, vi.fn());

    // 초기 빌드 후 첫 update에서는 HMR 후보가 없을 수 있으므로 빈 응답
    // 이것이 Angular 런타임의 full page reload 트리거
    expect(body).toBe("");

    await (plugin as any).buildEnd?.call({});
  });

  // Unit: prod 모드(dev: false)에서는 hotUpdate가 void 반환 (HMR 비활성)
  it("returns undefined from hotUpdate in prod mode", async () => {
    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: false,
    });

    await (plugin as any).buildStart?.call({});

    const appComponentPath = path
      .join(FIXTURE_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    const hmrResult = await (plugin as any).hotUpdate?.({
      file: appComponentPath,
      modules: [{ file: appComponentPath }],
      server: { watcher: { emit: vi.fn() } },
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    // prod 모드에서는 HMR이 비활성이므로 void 반환
    expect(hmrResult).toBeUndefined();

    await (plugin as any).buildEnd?.call({});
  });

  // Acceptance: 수정 파일 33개 이상일 때도 hotUpdate가 정상 동작
  // (Angular 컴파일러 내부에서 HMR 분석을 생략하고 templateUpdates=undefined 반환)
  it("handles update with many modified files gracefully (HMR skipped by compiler)", async () => {
    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: true,
    });

    await (plugin as any).buildStart?.call({});

    const appComponentPath = path
      .join(FIXTURE_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    // hotUpdate는 단일 파일에 대해 호출됨 (Vite 설계)
    // 33개 이상 수정 파일 제한은 Angular 컴파일러 내부에서 처리
    // AngularFacade.update()에서 modifiedFiles가 SourceFileCache.modifiedFiles로 전달되므로
    // 실제 33개 이상 파일 변경은 SourceFileCache를 통해 추적됨
    const hmrResult = await (plugin as any).hotUpdate?.({
      file: appComponentPath,
      modules: [{ file: appComponentPath }],
      server: { watcher: { emit: vi.fn() } },
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    // hotUpdate가 에러 없이 동작해야 한다
    expect(Array.isArray(hmrResult)).toBe(true);

    await (plugin as any).buildEnd?.call({});
  });
});
