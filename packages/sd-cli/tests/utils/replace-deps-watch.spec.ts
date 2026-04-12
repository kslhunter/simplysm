import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { watchReplaceDeps } from "../../src/deps/replace-deps/replace-deps";
import type { WatchReplaceDepResult } from "../../src/deps/replace-deps/replace-deps";

/**
 * watchReplaceDeps onChanged 콜백 단위 테스트.
 * 실제 파일시스템으로 테스트하되 개별 동작에 집중한다.
 */
describe("watchReplaceDeps onChanged", () => {
  let tmpDir: string;
  let watchResult: WatchReplaceDepResult | undefined;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-replace-deps-unit-"));

    // 소스 패키지 생성
    const sourceDir = path.join(tmpDir, "source-pkg", "src");
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "index.ts"), "export const v = 1;");

    // 프로젝트 구조 생성
    const targetDir = path.join(tmpDir, "project", "node_modules", "@test", "pkg", "src");
    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.writeFile(path.join(targetDir, "index.ts"), "export const v = 1;");

    // pnpm-workspace.yaml
    await fs.promises.writeFile(
      path.join(tmpDir, "project", "pnpm-workspace.yaml"),
      "packages:\n",
    );
  });

  afterEach(async () => {
    watchResult?.dispose();
    watchResult = undefined;
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
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
});
