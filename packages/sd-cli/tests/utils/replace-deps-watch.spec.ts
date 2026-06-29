import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import * as coreCommon from "@simplysm/core-common";
import { watchReplaceDeps } from "../../src/deps/replace-deps/replace-deps";
import type { WatchReplaceDepResult } from "../../src/deps/replace-deps/replace-deps";

/**
 * watchReplaceDeps onChanged 콜백 단위 테스트.
 * 실제 파일시스템으로 테스트하되 개별 동작에 집중한다.
 */
describe("watchReplaceDeps onChanged", () => {
  let tmpDir: string;
  let watchResult: WatchReplaceDepResult | undefined;
  let mockLogger: {
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-replace-deps-unit-"));

    mockLogger = {
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      start: vi.fn(),
      success: vi.fn(),
      debug: vi.fn(),
    };
    vi.spyOn(coreCommon, "createLogger").mockReturnValue(mockLogger as any);

    // 소스 패키지 생성
    const sourcePkg = path.join(tmpDir, "source-pkg");
    await fs.promises.mkdir(sourcePkg, { recursive: true });
    await fs.promises.writeFile(
      path.join(sourcePkg, "package.json"),
      JSON.stringify({ name: "@test/pkg", files: ["src"] }),
    );
    const sourceDir = path.join(sourcePkg, "src");
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "index.ts"), "export const v = 1;");

    // 프로젝트 구조 생성
    const targetDir = path.join(tmpDir, "project", "node_modules", "@test", "pkg", "src");
    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.writeFile(path.join(targetDir, "index.ts"), "export const v = 1;");

    // package.json#workspaces
    await fs.promises.writeFile(
      path.join(tmpDir, "project", "package.json"),
      JSON.stringify({ private: true, workspaces: [] }),
    );
  });

  afterEach(async () => {
    watchResult?.dispose();
    watchResult = undefined;
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("복수 파일 변경 시 300ms 배칭 후 onChanged가 한 번 호출된다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");

    // 추가 파일 생성
    await fs.promises.writeFile(path.join(sourcePath, "src", "utils.ts"), "export const u = 1;");
    const targetUtilsDir = path.join(tmpDir, "project", "node_modules", "@test", "pkg", "src");
    await fs.promises.writeFile(path.join(targetUtilsDir, "utils.ts"), "export const u = 1;");

    let callCount = 0;
    let resolveChanged: () => void;
    const changedPromise = new Promise<void>((resolve) => {
      resolveChanged = resolve;
    });

    watchResult = await watchReplaceDeps(projectRoot, { "@test/pkg": sourcePath }, {
      onChanged: () => {
        callCount++;
        resolveChanged();
      },
    });

    // 짧은 간격으로 두 파일 모두 변경
    await fs.promises.writeFile(path.join(sourcePath, "src", "index.ts"), "export const v = 2;");
    await fs.promises.writeFile(path.join(sourcePath, "src", "utils.ts"), "export const u = 2;");

    // 콜백 호출 대기
    await changedPromise;

    // 추가 호출이 없는지 확인하기 위해 잠시 대기
    await new Promise((r) => setTimeout(r, 1000));

    // 배칭으로 인해 1번만 호출
    expect(callCount).toBe(1);
  }, 10_000);

  it("files에 없는 파일의 변경은 감지되지 않는다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");

    // files에 없는 파일 생성
    await fs.promises.writeFile(path.join(sourcePath, "tsconfig.json"), "{}");

    let callCount = 0;

    watchResult = await watchReplaceDeps(projectRoot, { "@test/pkg": sourcePath }, {
      onChanged: () => {
        callCount++;
      },
    });

    // files에 없는 파일 변경
    await fs.promises.writeFile(path.join(sourcePath, "tsconfig.json"), '{"strict": true}');

    // 충분한 대기 시간 (300ms 배칭 + 여유)
    await new Promise((r) => setTimeout(r, 1500));

    // files에 없으므로 감지되지 않음
    expect(callCount).toBe(0);
  }, 10_000);

  it("npm 기본 파일(README.md) 변경이 감지된다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");

    // 소스에 README.md 생성
    await fs.promises.writeFile(path.join(sourcePath, "README.md"), "# README v1");

    let resolveChanged: () => void;
    const changedPromise = new Promise<void>((resolve) => {
      resolveChanged = resolve;
    });

    watchResult = await watchReplaceDeps(projectRoot, { "@test/pkg": sourcePath }, {
      onChanged: () => {
        resolveChanged();
      },
    });

    // README.md 변경
    await fs.promises.writeFile(path.join(sourcePath, "README.md"), "# README v2");

    // 콜백 호출 대기
    await changedPromise;
  }, 10_000);

  it("nested source 경로는 longest-prefix로 소속이 결정된다", async () => {
    // sourceOuter: tmpDir/outer-pkg
    // sourceInner: tmpDir/outer-pkg/inner-pkg (outer의 하위)
    const outerPkg = path.join(tmpDir, "outer-pkg");
    await fs.promises.mkdir(path.join(outerPkg, "src"), { recursive: true });
    await fs.promises.writeFile(
      path.join(outerPkg, "package.json"),
      JSON.stringify({ name: "@test/outer", files: ["src"] }),
    );
    await fs.promises.writeFile(path.join(outerPkg, "src", "o.ts"), "o");

    const innerPkg = path.join(outerPkg, "inner-pkg");
    await fs.promises.mkdir(path.join(innerPkg, "src"), { recursive: true });
    await fs.promises.writeFile(
      path.join(innerPkg, "package.json"),
      JSON.stringify({ name: "@test/inner", files: ["src"] }),
    );
    await fs.promises.writeFile(path.join(innerPkg, "src", "i.ts"), "i");

    // target들
    const outerTarget = path.join(
      tmpDir, "project", "node_modules", "@test", "outer", "src",
    );
    const innerTarget = path.join(
      tmpDir, "project", "node_modules", "@test", "inner", "src",
    );
    await fs.promises.mkdir(outerTarget, { recursive: true });
    await fs.promises.mkdir(innerTarget, { recursive: true });
    await fs.promises.writeFile(path.join(outerTarget, "o.ts"), "o");
    await fs.promises.writeFile(path.join(innerTarget, "i.ts"), "i");

    const projectRoot = path.join(tmpDir, "project");

    watchResult = await watchReplaceDeps(
      projectRoot,
      { "@test/outer": outerPkg, "@test/inner": innerPkg },
    );

    // inner 파일 변경 — longest-prefix로 inner source에만 매칭되어야 함
    await fs.promises.writeFile(path.join(innerPkg, "src", "i.ts"), "i2");
    await new Promise((r) => setTimeout(r, 1500));

    const innerCopied = await fs.promises.readFile(path.join(innerTarget, "i.ts"), "utf-8");
    expect(innerCopied).toBe("i2");

    // outer target에는 i.ts가 복사되지 않아야 함 (잘못된 매칭 방지)
    const outerHasI = await fs.promises
      .access(path.join(outerTarget, "inner-pkg", "src", "i.ts"))
      .then(() => true, () => false);
    expect(outerHasI).toBe(false);
  }, 10_000);

  it("options 파라미터가 undefined일 때 에러가 발생하지 않는다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");

    // options를 명시적으로 undefined 전달
    watchResult = await watchReplaceDeps(projectRoot, { "@test/pkg": sourcePath }, undefined);

    // 파일 변경
    await fs.promises.writeFile(path.join(sourcePath, "src", "index.ts"), "export const v = 99;");

    await new Promise((r) => setTimeout(r, 1500));
    // 에러 없이 완료됨
  }, 10_000);

  it("source의 files 필드가 없으면 경고를 출력하고 감시에서 제외한다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");

    // files 필드 제거
    await fs.promises.writeFile(
      path.join(sourcePath, "package.json"),
      JSON.stringify({ name: "@test/pkg" }),
    );

    let callCount = 0;
    watchResult = await watchReplaceDeps(projectRoot, { "@test/pkg": sourcePath }, {
      onChanged: () => {
        callCount++;
      },
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("package.json에 files 필드가 없어 감시 건너뜀"),
    );

    // 파일을 변경해도 감지되지 않음
    await fs.promises.writeFile(
      path.join(sourcePath, "src", "index.ts"),
      "export const v = 2;",
    );
    await new Promise((r) => setTimeout(r, 1500));

    expect(callCount).toBe(0);
  }, 10_000);

  it("동일 내용 재저장 시 isFileContentSame 스킵으로 onChanged가 호출되지 않는다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");

    // beforeEach에서 source와 target 모두 "export const v = 1;"로 설정된 상태
    let callCount = 0;
    watchResult = await watchReplaceDeps(projectRoot, { "@test/pkg": sourcePath }, {
      onChanged: () => {
        callCount++;
      },
    });

    // 동일 내용으로 재저장 (mtime은 변경되지만 내용은 같음)
    await fs.promises.writeFile(
      path.join(sourcePath, "src", "index.ts"),
      "export const v = 1;",
    );

    await new Promise((r) => setTimeout(r, 1500));

    // isFileContentSame이 true를 반환하여 복사 스킵 → hasActualCopy=false → onChanged 미호출
    expect(callCount).toBe(0);
  }, 10_000);

  it("dispose 이후의 파일 변경은 감지되지 않는다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");

    let callCount = 0;
    const result = await watchReplaceDeps(projectRoot, { "@test/pkg": sourcePath }, {
      onChanged: () => {
        callCount++;
      },
    });

    result.dispose();
    // afterEach에서 중복 dispose 방지
    watchResult = undefined;

    // close 완료 대기
    await new Promise((r) => setTimeout(r, 500));

    await fs.promises.writeFile(
      path.join(sourcePath, "src", "index.ts"),
      "export const v = 99;",
    );

    await new Promise((r) => setTimeout(r, 1500));

    expect(callCount).toBe(0);
  }, 10_000);

  it("모든 source의 files 필드가 없으면 감시 대상이 없음 경고를 출력한다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");

    // files 필드 제거
    await fs.promises.writeFile(
      path.join(sourcePath, "package.json"),
      JSON.stringify({ name: "@test/pkg" }),
    );

    watchResult = await watchReplaceDeps(projectRoot, { "@test/pkg": sourcePath });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("감시 대상이 없어 워치가 시작되지 않음"),
    );
  }, 10_000);

  it("files 필드가 없으면 해당 source에 대한 readdir이 호출되지 않는다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");

    // files 필드 제거
    await fs.promises.writeFile(
      path.join(sourcePath, "package.json"),
      JSON.stringify({ name: "@test/pkg" }),
    );

    const readdirSpy = vi.spyOn(fs.promises, "readdir");

    watchResult = await watchReplaceDeps(projectRoot, { "@test/pkg": sourcePath });

    // sourcePath에 대한 readdir 호출이 없어야 함 (files null이면 생략되어야 함)
    const sourcePathPosix = path.resolve(sourcePath).replace(/\\/g, "/");
    const calledWithSource = readdirSpy.mock.calls.some((args) => {
      const arg = args[0];
      if (typeof arg !== "string") return false;
      return arg.replace(/\\/g, "/") === sourcePathPosix;
    });

    expect(calledWithSource).toBe(false);
  }, 10_000);
});
