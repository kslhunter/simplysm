import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { watchReplaceDeps } from "../../src/deps/replace-deps/replace-deps";
import type { WatchReplaceDepResult } from "../../src/deps/replace-deps/replace-deps";

/**
 * watchReplaceDeps onChanged 콜백 통합 테스트.
 *
 * 실제 파일시스템에서 임시 디렉토리 구조를 생성하고,
 * watchReplaceDeps를 실행한 뒤 파일 변경 → onChanged 콜백 호출을 검증한다.
 *
 * 구조:
 *   tmpDir/
 *     source-pkg/         ← replaceDeps 소스 (감시 대상)
 *       src/
 *         index.ts
 *     project/
 *       node_modules/
 *         @test/
 *           pkg/          ← replaceDeps 타겟 (복사 대상)
 *             src/
 *               index.ts
 *       package.json
 */
describe("watchReplaceDeps onChanged 콜백", () => {
  let tmpDir: string;
  let watchResult: WatchReplaceDepResult | undefined;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-replace-deps-"));

    // 소스 패키지 생성
    const sourcePkg = path.join(tmpDir, "source-pkg");
    await fs.promises.mkdir(sourcePkg, { recursive: true });
    await fs.promises.writeFile(
      path.join(sourcePkg, "package.json"),
      JSON.stringify({ name: "@test/pkg", files: ["src"] }),
    );
    const sourceDir = path.join(sourcePkg, "src");
    await fs.promises.mkdir(sourceDir, { recursive: true });
    await fs.promises.writeFile(path.join(sourceDir, "index.ts"), "export const a = 1;");

    // 프로젝트 구조 생성
    const targetDir = path.join(tmpDir, "project", "node_modules", "@test", "pkg", "src");
    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.writeFile(path.join(targetDir, "index.ts"), "export const a = 1;");

    // package.json#workspaces (빈 워크스페이스)
    await fs.promises.writeFile(
      path.join(tmpDir, "project", "package.json"),
      JSON.stringify({ private: true, workspaces: [] }),
    );
  });

  afterEach(async () => {
    watchResult?.dispose();
    watchResult = undefined;
    // 임시 디렉토리 정리
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it("파일 복사 완료 후 onChanged 콜백이 호출된다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");
    const replaceDeps = { "@test/pkg": sourcePath };

    let resolveChanged: () => void;
    const changedPromise = new Promise<void>((resolve) => {
      resolveChanged = resolve;
    });

    watchResult = await watchReplaceDeps(projectRoot, replaceDeps, {
      onChanged: () => {
        resolveChanged();
      },
    });

    // 소스 파일 수정
    await fs.promises.writeFile(
      path.join(sourcePath, "src", "index.ts"),
      "export const a = 2;",
    );

    // 콜백 호출 대기
    await changedPromise;
  }, 10_000);

  it("onChanged 미등록 시 에러 없이 정상 동작한다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");
    const replaceDeps = { "@test/pkg": sourcePath };

    // onChanged 없이 호출
    watchResult = await watchReplaceDeps(projectRoot, replaceDeps);

    // 소스 파일 수정
    await fs.promises.writeFile(
      path.join(sourcePath, "src", "index.ts"),
      "export const a = 3;",
    );

    // 에러 없이 대기
    await new Promise((r) => setTimeout(r, 1500));

    // 파일이 복사되었는지 확인
    const targetContent = await fs.promises.readFile(
      path.join(tmpDir, "project", "node_modules", "@test", "pkg", "src", "index.ts"),
      "utf-8",
    );
    expect(targetContent).toBe("export const a = 3;");
  }, 10_000);

  it("파일 삭제 시에도 onChanged 콜백이 호출된다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");
    const replaceDeps = { "@test/pkg": sourcePath };

    let resolveChanged: () => void;
    const changedPromise = new Promise<void>((resolve) => {
      resolveChanged = resolve;
    });

    watchResult = await watchReplaceDeps(projectRoot, replaceDeps, {
      onChanged: () => {
        resolveChanged();
      },
    });

    // 소스 파일 삭제
    await fs.promises.unlink(path.join(sourcePath, "src", "index.ts"));

    // 콜백 호출 대기
    await changedPromise;
  }, 10_000);

  it("동일 source를 참조하는 복수 entry가 있으면 모든 target에 복사된다", async () => {
    // 추가 target 디렉토리 생성 (@test/pkgB)
    const targetDirB = path.join(tmpDir, "project", "node_modules", "@test", "pkgB", "src");
    await fs.promises.mkdir(targetDirB, { recursive: true });
    await fs.promises.writeFile(path.join(targetDirB, "index.ts"), "export const a = 1;");

    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");

    // 두 패턴이 동일 sourcePath를 참조
    const replaceDeps = {
      "@test/pkg": sourcePath,
      "@test/pkgB": sourcePath,
    };

    let callCount = 0;
    watchResult = await watchReplaceDeps(projectRoot, replaceDeps, {
      onChanged: () => {
        callCount++;
      },
    });

    // 소스 파일 변경
    await fs.promises.writeFile(
      path.join(sourcePath, "src", "index.ts"),
      "export const a = 9;",
    );

    // 배칭 + 복사 완료 대기
    await new Promise((r) => setTimeout(r, 1500));

    // 두 target 모두 업데이트
    const targetAContent = await fs.promises.readFile(
      path.join(tmpDir, "project", "node_modules", "@test", "pkg", "src", "index.ts"),
      "utf-8",
    );
    const targetBContent = await fs.promises.readFile(
      path.join(targetDirB, "index.ts"),
      "utf-8",
    );
    expect(targetAContent).toBe("export const a = 9;");
    expect(targetBContent).toBe("export const a = 9;");

    // 동일 source의 중복 watchPath는 하나로 통합되므로 이벤트가 1회만 배칭됨 → onChanged 1회
    expect(callCount).toBe(1);
  }, 10_000);

  it("소스 파일이 삭제되면 대상 파일도 삭제된다", async () => {
    const projectRoot = path.join(tmpDir, "project");
    const sourcePath = path.join(tmpDir, "source-pkg");
    const replaceDeps = { "@test/pkg": sourcePath };

    let resolveChanged: () => void;
    const changedPromise = new Promise<void>((resolve) => {
      resolveChanged = resolve;
    });

    watchResult = await watchReplaceDeps(projectRoot, replaceDeps, {
      onChanged: () => {
        resolveChanged();
      },
    });

    const destPath = path.join(
      tmpDir, "project", "node_modules", "@test", "pkg", "src", "index.ts",
    );

    // 삭제 전 target 파일 존재 확인
    await expect(fs.promises.access(destPath)).resolves.toBeUndefined();

    // 소스 삭제
    await fs.promises.unlink(path.join(sourcePath, "src", "index.ts"));

    await changedPromise;

    // 삭제 반영까지 여유 대기
    await new Promise((r) => setTimeout(r, 500));

    // target도 삭제됨
    const targetExists = await fs.promises
      .access(destPath)
      .then(() => true, () => false);
    expect(targetExists).toBe(false);
  }, 10_000);
});
