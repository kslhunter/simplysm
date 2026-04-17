import { describe, it, expect } from "vitest";
import esbuild from "esbuild";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures", "worker-plugin");

const { transformWorkerPatterns, createWorkerBundlePlugin, findWorkerPatterns } = await import(
  "../../src/esbuild/esbuild-worker-plugin.js"
);

/**
 * transformWorkerPatterns 테스트용 최소 PluginBuild mock 생성.
 * 실제 esbuild 모듈을 사용하여 Worker 번들링이 동작한다.
 */
function createMockBuild(overrides?: Partial<esbuild.BuildOptions>): esbuild.PluginBuild {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-unit-"));
  return {
    esbuild,
    initialOptions: {
      outdir: tmpDir,
      write: false,
      ...overrides,
    },
  } as unknown as esbuild.PluginBuild;
}

/**
 * transformSync 호출을 추적할 수 있도록 esbuild 네임스페이스를 wrap한다.
 * vi.spyOn이 ESM namespace frozen property에서 실패하므로 대안으로 사용한다.
 */
function createTrackedBuild(overrides?: Partial<esbuild.BuildOptions>): {
  build: esbuild.PluginBuild;
  transformSyncCalls: Array<Parameters<typeof esbuild.transformSync>>;
} {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-unit-"));
  const transformSyncCalls: Array<Parameters<typeof esbuild.transformSync>> = [];
  const trackedEsbuild = {
    ...esbuild,
    transformSync: (...args: Parameters<typeof esbuild.transformSync>) => {
      transformSyncCalls.push(args);
      return esbuild.transformSync(...args);
    },
  } as typeof esbuild;

  const build = {
    esbuild: trackedEsbuild,
    initialOptions: {
      outdir: tmpDir,
      write: false,
      ...overrides,
    },
  } as unknown as esbuild.PluginBuild;

  return { build, transformSyncCalls };
}

describe("transformWorkerPatterns — 패턴 감지", () => {
  it("Worker 패턴이 없는 content에 대해 undefined를 반환한다", () => {
    const result = transformWorkerPatterns(
      'console.log("hello");',
      "/test/entry.js",
      createMockBuild(),
    );

    expect(result).toBeUndefined();
  });

  it("'Worker' 문자열이 있지만 new URL 패턴이 아니면 undefined를 반환한다", () => {
    const result = transformWorkerPatterns(
      'const w = new Worker("./worker.js");',
      "/test/entry.js",
      createMockBuild(),
    );

    expect(result).toBeUndefined();
  });

  it("import.meta.url이 아닌 URL 생성은 undefined를 반환한다", () => {
    const result = transformWorkerPatterns(
      'const w = new Worker(new URL("./worker.js", location.href));',
      "/test/entry.js",
      createMockBuild(),
    );

    expect(result).toBeUndefined();
  });

  it("주석 내 Worker 패턴은 무시한다", () => {
    const result = transformWorkerPatterns(
      `// new Worker(new URL("./worker.js", import.meta.url))
const x = 1;`,
      "/test/entry.js",
      createMockBuild(),
    );

    expect(result).toBeUndefined();
  });

  it("문자열 리터럴 내 Worker 패턴은 무시한다", () => {
    const result = transformWorkerPatterns(
      `const s = "new Worker(new URL(\\"./worker.js\\", import.meta.url))";`,
      "/test/entry.js",
      createMockBuild(),
    );

    expect(result).toBeUndefined();
  });

  it("Worker + new URL + import.meta.url 패턴을 감지하여 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).not.toContain("./worker.js");
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
    expect(result!.errors).toHaveLength(0);
  });

  it("SharedWorker + new URL + import.meta.url 패턴을 감지하여 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const sw = new SharedWorker(new URL("./shared-worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).not.toContain("./shared-worker.js");
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
  });

  it("복수 Worker 패턴을 모두 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      [
        `const w1 = new Worker(new URL("./worker.js", import.meta.url));`,
        `const w2 = new Worker(new URL("./worker2.js", import.meta.url));`,
      ].join("\n"),
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).not.toContain("./worker.js");
    expect(result!.contents).not.toContain("./worker2.js");
  });
});

describe("transformWorkerPatterns — type: module 처리", () => {
  it("옵션 없는 Worker에 { type: 'module' }을 추가한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    // { type: "module" } 추가됨
    expect(result!.contents).toMatch(/\{\s*type:\s*"module"\s*\}/);
  });

  it("기존 옵션이 있으면 그대로 유지한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).toContain('{ type: "module" }');
  });
});

describe("transformWorkerPatterns — 에러 처리", () => {
  it("Worker 빌드 에러를 errors에 포함하여 반환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker-error.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.errors.length).toBeGreaterThan(0);
  });
});

describe("transformWorkerPatterns — write 옵션", () => {
  it("write: false일 때 workerOutputFiles를 반환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild({ write: false }),
    );

    expect(result).toBeDefined();
    expect(result!.workerOutputFiles).toBeDefined();
    expect(result!.workerOutputFiles!.length).toBeGreaterThan(0);
  });

  it("write: true일 때 workerOutputFiles가 undefined이다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-write-"));

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild({ write: true, outdir: tmpDir }),
    );

    expect(result).toBeDefined();
    expect(result!.workerOutputFiles).toBeUndefined();

    // 대신 디스크에 파일이 기록됨
    const files = fs.readdirSync(tmpDir);
    const workerFile = files.find((f) => /worker-[a-z0-9]+\.js$/i.test(f));
    expect(workerFile).toBeDefined();
  });
});

describe("transformWorkerPatterns — import.meta.resolve 패턴", () => {
  it("import.meta.resolve 상대 경로 패턴을 감지하여 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const p = import.meta.resolve("./node-worker.js");`,
      entryPath,
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeDefined();
    expect(result!.contents).not.toContain("./node-worker.js");
    expect(result!.contents).toMatch(/new URL\("worker-[a-z0-9]+\.js", import\.meta\.url\)\.href/i);
    expect(result!.errors).toHaveLength(0);
  });

  it("절대 모듈 경로의 import.meta.resolve는 무시한다", () => {
    const result = transformWorkerPatterns(
      `const p = import.meta.resolve("some-package");`,
      "/test/entry.js",
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeUndefined();
  });

  it("import.meta.resolve 패턴 없는 파일은 undefined를 반환한다", () => {
    const result = transformWorkerPatterns(
      `console.log("no resolve");`,
      "/test/entry.js",
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeUndefined();
  });

  it("브라우저 + Node.js Worker 패턴이 공존하면 모두 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      [
        `const w = new Worker(new URL("./worker.js", import.meta.url));`,
        `const p = import.meta.resolve("./node-worker.js");`,
      ].join("\n"),
      entryPath,
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeDefined();
    // 브라우저 Worker 치환
    expect(result!.contents).not.toContain('"./worker.js"');
    // Node.js resolve 치환
    expect(result!.contents).not.toContain("import.meta.resolve");
    expect(result!.contents).toMatch(/new URL\("worker-[a-z0-9]+\.js", import\.meta\.url\)\.href/i);
  });

  it("import.meta.resolve Worker 빌드 에러를 errors에 포함한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const p = import.meta.resolve("./worker-error.js");`,
      entryPath,
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeDefined();
    expect(result!.errors.length).toBeGreaterThan(0);
  });

  it("write: false일 때 workerOutputFiles를 반환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.js");

    const result = transformWorkerPatterns(
      `const p = import.meta.resolve("./node-worker.js");`,
      entryPath,
      createMockBuild({ write: false, platform: "node" }),
    );

    expect(result).toBeDefined();
    expect(result!.workerOutputFiles).toBeDefined();
    expect(result!.workerOutputFiles!.length).toBeGreaterThan(0);
  });
});

describe("createWorkerBundlePlugin — 플러그인 구조", () => {
  it("esbuild Plugin 프로토콜을 따르는 객체를 반환한다", () => {
    const plugin = createWorkerBundlePlugin();

    expect(plugin.name).toBe("sd-worker-bundle");
    expect(typeof plugin.setup).toBe("function");
  });

  it("setup에서 onLoad/onEnd 훅이 등록된다", async () => {
    const plugin = createWorkerBundlePlugin();

    let hasOnLoad = false;
    let hasOnEnd = false;

    const mockBuild = {
      initialOptions: {},
      onLoad(_opts: unknown, _cb: unknown) { hasOnLoad = true; },
      onEnd(_cb: unknown) { hasOnEnd = true; },
    } as unknown as esbuild.PluginBuild;

    await plugin.setup(mockBuild);

    expect(hasOnLoad).toBe(true);
    expect(hasOnEnd).toBe(true);
  });
});

describe("findWorkerPatterns — AST 기반 패턴 탐지", () => {
  it("Worker + new URL + import.meta.url 패턴을 탐지한다", () => {
    const matches = findWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("browser");
    expect(matches[0].urlPath).toBe("./worker.js");
    expect(matches[0].workerType).toBe("Worker");
    expect(matches[0].existingOpts).toBeUndefined();
  });

  it("SharedWorker 패턴을 탐지한다", () => {
    const matches = findWorkerPatterns(
      `const sw = new SharedWorker(new URL("./sw.js", import.meta.url));`,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].workerType).toBe("SharedWorker");
    expect(matches[0].urlPath).toBe("./sw.js");
  });

  it("옵션 객체가 있는 Worker 패턴을 탐지하고 원본 텍스트를 보존한다", () => {
    const content = `const w = new Worker(new URL("./w.js", import.meta.url), { type: "module" });`;
    const matches = findWorkerPatterns(content);

    expect(matches).toHaveLength(1);
    expect(matches[0].existingOpts).toBe('{ type: "module" }');
  });

  it("import.meta.resolve 상대 경로 패턴을 탐지한다", () => {
    const matches = findWorkerPatterns(
      `const p = import.meta.resolve("./node-worker.js");`,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].type).toBe("node");
    expect(matches[0].urlPath).toBe("./node-worker.js");
  });

  it("import.meta.resolve 절대 모듈 경로는 무시한다", () => {
    const matches = findWorkerPatterns(
      `const p = import.meta.resolve("some-package");`,
    );

    expect(matches).toHaveLength(0);
  });

  it("new URL 없는 Worker는 무시한다", () => {
    const matches = findWorkerPatterns(
      `const w = new Worker("./worker.js");`,
    );

    expect(matches).toHaveLength(0);
  });

  it("import.meta.url이 아닌 URL 생성은 무시한다", () => {
    const matches = findWorkerPatterns(
      `const w = new Worker(new URL("./w.js", location.href));`,
    );

    expect(matches).toHaveLength(0);
  });

  it("복수 패턴을 모두 탐지한다", () => {
    const matches = findWorkerPatterns(
      [
        `const w1 = new Worker(new URL("./w1.js", import.meta.url));`,
        `const w2 = new Worker(new URL("./w2.js", import.meta.url));`,
      ].join("\n"),
    );

    expect(matches).toHaveLength(2);
    expect(matches[0].urlPath).toBe("./w1.js");
    expect(matches[1].urlPath).toBe("./w2.js");
  });

  it("start/end 위치가 정확하다", () => {
    const content = `const w = new Worker(new URL("./w.js", import.meta.url));`;
    const matches = findWorkerPatterns(content);

    expect(matches).toHaveLength(1);
    const matched = content.slice(matches[0].start, matches[0].end);
    expect(matched).toBe(`new Worker(new URL("./w.js", import.meta.url))`);
  });

  it("주석 내 Worker 패턴은 무시한다", () => {
    const matches = findWorkerPatterns(
      `// new Worker(new URL("./w.js", import.meta.url))
const x = 1;`,
    );

    expect(matches).toHaveLength(0);
  });

  it("문자열 리터럴 내 Worker 패턴은 무시한다", () => {
    const matches = findWorkerPatterns(
      `const s = "new Worker(new URL(\\"./w.js\\", import.meta.url))";`,
    );

    expect(matches).toHaveLength(0);
  });

  it("블록 주석 내 Worker 패턴은 무시한다", () => {
    const matches = findWorkerPatterns(
      `/* new Worker(new URL("./w.js", import.meta.url)) */
const x = 1;`,
    );

    expect(matches).toHaveLength(0);
  });

  it("주석 내 import.meta.resolve는 무시한다", () => {
    const matches = findWorkerPatterns(
      `// import.meta.resolve("./w.js")
const x = 1;`,
    );

    expect(matches).toHaveLength(0);
  });

  it("파싱 불가능한 코드는 빈 배열을 반환한다", () => {
    const matches = findWorkerPatterns(
      `this is not valid javascript }{][`,
    );

    expect(matches).toHaveLength(0);
  });
});

describe("transformWorkerPatterns — TypeScript 파일 처리", () => {
  it("import type이 포함된 .ts 파일에서 Worker 패턴을 탐지하여 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const result = transformWorkerPatterns(
      `import type { T } from "pkg";
const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).not.toContain("./worker.js");
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
    expect(result!.errors).toHaveLength(0);
  });

  it("import type이 포함된 .ts 파일에서 import.meta.resolve 패턴을 탐지하여 치환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const result = transformWorkerPatterns(
      `import type { T } from "pkg";
const p = import.meta.resolve("./node-worker.js");`,
      entryPath,
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeDefined();
    expect(result!.contents).not.toContain("./node-worker.js");
    expect(result!.contents).toMatch(
      /new URL\("worker-[a-z0-9]+\.js", import\.meta\.url\)\.href/i,
    );
    expect(result!.errors).toHaveLength(0);
  });

  it("타입 어노테이션이 있는 변수 선언(const w: Worker = ...)에서 Worker를 탐지한다", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const result = transformWorkerPatterns(
      `const w: Worker = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
  });

  it(".mts 확장자의 TS 파일도 변환 후 처리한다", () => {
    const entryPath = path.join(fixturesDir, "entry.mts");
    const result = transformWorkerPatterns(
      `import type { T } from "pkg";
const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
  });

  it(".cts 확장자의 TS 파일도 변환 후 처리한다", () => {
    const entryPath = path.join(fixturesDir, "entry.cts");
    const result = transformWorkerPatterns(
      `import type { T } from "pkg";
const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
  });

  it("TS 파일의 주석 내 Worker 패턴은 무시한다", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const result = transformWorkerPatterns(
      `import type { T } from "pkg";
// new Worker(new URL("./worker.js", import.meta.url))
const x: number = 1;`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeUndefined();
  });

  it("TS 파일의 문자열 리터럴 내 Worker 패턴은 무시한다", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const result = transformWorkerPatterns(
      `import type { T } from "pkg";
const s: string = "new Worker(new URL(\\"./worker.js\\", import.meta.url))";`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeUndefined();
  });

  it("사전 필터를 통과하지 못하는 TS 파일(Worker 키워드 없음)은 undefined를 반환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const result = transformWorkerPatterns(
      `import type { T } from "pkg";
const x: number = 1;`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeUndefined();
  });

  it("TS 변환 실패(문법 오류) 시 errors에 에러를 포함하여 반환한다", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url)); const x: =`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.errors.length).toBeGreaterThan(0);
  });
});

describe("createWorkerBundlePlugin — TS 파일 onLoad 반환", () => {
  it("TS 파일에서 Worker 감지 시 loader로 'js'를 반환한다", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "worker-onload-"));
    const tsFile = path.join(tmpDir, "entry.ts");
    fs.copyFileSync(
      path.join(fixturesDir, "worker.js"),
      path.join(tmpDir, "worker.js"),
    );
    fs.writeFileSync(
      tsFile,
      `import type { T } from "pkg";
const w = new Worker(new URL("./worker.js", import.meta.url));`,
    );

    const plugin = createWorkerBundlePlugin();

    let onLoadCallback: ((args: { path: string }) => Promise<any> | any) | null = null;
    const mockBuild = {
      esbuild,
      initialOptions: { outdir: tmpDir, write: false },
      onLoad: (_filter: unknown, cb: (args: { path: string }) => Promise<any> | any) => {
        onLoadCallback = cb;
      },
      onEnd: () => { /* noop */ },
    } as unknown as esbuild.PluginBuild;

    await plugin.setup(mockBuild);
    expect(onLoadCallback).not.toBeNull();

    const result = await onLoadCallback!({ path: tsFile });
    expect(result).toBeDefined();
    expect(result.loader).toBe("js");
    expect(result.contents).toMatch(/worker-[a-z0-9]+\.js/i);
  });
});

describe("transformWorkerPatterns — skipTsTransform 옵션", () => {
  it("skipTsTransform: true + .ts 경로 + JS content → transformSync 호출 없이 정상 치환", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const { build, transformSyncCalls } = createTrackedBuild();

    // ngtsc emit 결과를 흉내: 파일 경로는 .ts이지만 content는 이미 JS
    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      build,
      { skipTsTransform: true },
    );

    expect(transformSyncCalls).toHaveLength(0);
    expect(result).toBeDefined();
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
    expect(result!.errors).toHaveLength(0);
  });

  it("skipTsTransform: true + .ts 경로 + 실제 TS 구문 → 계약 위반으로 undefined (조용한 누락)", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const { build, transformSyncCalls } = createTrackedBuild();

    // 호출자가 계약을 위반하여 실제 TS 구문을 넘긴 경우:
    // transformSync가 스킵되므로 acorn이 TS 구문 파싱 실패 → 빈 matches → undefined
    const result = transformWorkerPatterns(
      `import type { T } from "pkg";
const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      build,
      { skipTsTransform: true },
    );

    expect(transformSyncCalls).toHaveLength(0);
    expect(result).toBeUndefined();
  });

  it("옵션 생략 + .ts + import type + Worker → transformSync 호출 후 정상 감지 (후방 호환)", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const { build, transformSyncCalls } = createTrackedBuild();

    const result = transformWorkerPatterns(
      `import type { T } from "pkg";
const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      build,
    );

    expect(transformSyncCalls).toHaveLength(1);
    expect(transformSyncCalls[0][1]).toMatchObject({ loader: "ts" });
    expect(result).toBeDefined();
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
  });

  it("옵션 { skipTsTransform: false } → 기본 동작 (transformSync 호출)", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const { build, transformSyncCalls } = createTrackedBuild();

    const result = transformWorkerPatterns(
      `import type { T } from "pkg";
const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      build,
      { skipTsTransform: false },
    );

    expect(transformSyncCalls).toHaveLength(1);
    expect(result).toBeDefined();
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
  });

  it("빈 객체 {} → skipTsTransform undefined → 기본 동작 (transformSync 호출)", () => {
    const entryPath = path.join(fixturesDir, "entry.ts");
    const { build, transformSyncCalls } = createTrackedBuild();

    const result = transformWorkerPatterns(
      `import type { T } from "pkg";
const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      build,
      {},
    );

    expect(transformSyncCalls).toHaveLength(1);
    expect(result).toBeDefined();
  });

  it("skipTsTransform: true + .js 경로 → 동작 동일 (확장자 분기 진입 안 함)", () => {
    const entryPath = path.join(fixturesDir, "entry.js");
    const { build, transformSyncCalls } = createTrackedBuild();

    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      build,
      { skipTsTransform: true },
    );

    expect(transformSyncCalls).toHaveLength(0);
    expect(result).toBeDefined();
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
  });
});

describe("transformWorkerPatterns — 사전 필터 정규식 경계", () => {
  it("타입 어노테이션만 등장한 Worker 키워드 → 사전 필터 차단", () => {
    const { build, transformSyncCalls } = createTrackedBuild();

    const result = transformWorkerPatterns(
      `const x: Worker = 1 as any;`,
      path.join(fixturesDir, "entry.ts"),
      build,
    );

    expect(transformSyncCalls).toHaveLength(0);
    expect(result).toBeUndefined();
  });

  it("interface 선언에만 등장한 Worker → 사전 필터 차단", () => {
    const { build, transformSyncCalls } = createTrackedBuild();

    const result = transformWorkerPatterns(
      `interface WorkerLike { run(): void; }`,
      path.join(fixturesDir, "entry.ts"),
      build,
    );

    expect(transformSyncCalls).toHaveLength(0);
    expect(result).toBeUndefined();
  });

  it("import type에만 등장한 Worker → 사전 필터 차단", () => {
    const { build, transformSyncCalls } = createTrackedBuild();

    const result = transformWorkerPatterns(
      `import type { Worker } from "./types";`,
      path.join(fixturesDir, "entry.ts"),
      build,
    );

    expect(transformSyncCalls).toHaveLength(0);
    expect(result).toBeUndefined();
  });

  it("new Worker 호출 → 사전 필터 통과, AST 감지", () => {
    const entryPath = path.join(fixturesDir, "entry.js");
    const result = transformWorkerPatterns(
      `const w = new Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
  });

  it("new SharedWorker 호출 → 사전 필터 통과, AST 감지", () => {
    const entryPath = path.join(fixturesDir, "entry.js");
    const result = transformWorkerPatterns(
      `const sw = new SharedWorker(new URL("./shared-worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
    expect(result!.contents).toMatch(/worker-[a-z0-9]+\.js/i);
  });

  it("import.meta.resolve 호출 → 사전 필터 통과, AST 감지", () => {
    const entryPath = path.join(fixturesDir, "entry.js");
    const result = transformWorkerPatterns(
      `const p = import.meta.resolve("./node-worker.js");`,
      entryPath,
      createMockBuild({ platform: "node" }),
    );

    expect(result).toBeDefined();
    expect(result!.contents).toMatch(
      /new URL\("worker-[a-z0-9]+\.js", import\.meta\.url\)\.href/i,
    );
  });

  it("new  Worker (연속 공백) → 사전 필터 통과", () => {
    const entryPath = path.join(fixturesDir, "entry.js");
    const result = transformWorkerPatterns(
      `const w = new   Worker(new URL("./worker.js", import.meta.url));`,
      entryPath,
      createMockBuild(),
    );

    expect(result).toBeDefined();
  });

  it("WorkerSubClass 식별자 (단어 경계 위반) → 사전 필터 차단", () => {
    const { build, transformSyncCalls } = createTrackedBuild();

    const result = transformWorkerPatterns(
      `class WorkerSubClass {}\nconst x = new WorkerSubClass();`,
      path.join(fixturesDir, "entry.ts"),
      build,
    );

    expect(transformSyncCalls).toHaveLength(0);
    expect(result).toBeUndefined();
  });
});
