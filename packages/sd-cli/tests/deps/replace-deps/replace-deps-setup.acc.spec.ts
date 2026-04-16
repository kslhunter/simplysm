import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { setupReplaceDeps } from "../../../src/deps/replace-deps/replace-deps";
import { pathx } from "@simplysm/core-node";

describe("setupReplaceDeps 화이트리스트 복사", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = pathx.posix(await fs.promises.mkdtemp(path.join(os.tmpdir(), "sd-replace-deps-")));

    // pnpm-workspace.yaml
    const projectRoot = pathx.posix(path.join(tmpDir, "project"));
    await fs.promises.mkdir(projectRoot, { recursive: true });
    await fs.promises.writeFile(
      pathx.posix(path.join(projectRoot, "pnpm-workspace.yaml")),
      "packages:\n",
    );

    // 타겟 (node_modules에 기존 패키지)
    const targetPkgDir = pathx.posix(
      path.join(projectRoot, "node_modules", "@test", "pkg"),
    );
    await fs.promises.mkdir(targetPkgDir, { recursive: true });
    await fs.promises.writeFile(
      pathx.posix(path.join(targetPkgDir, "package.json")),
      JSON.stringify({ name: "@test/pkg", version: "2.0.0" }),
    );
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  /**
   * 소스 패키지를 생성하는 헬퍼
   */
  async function createSourcePkg(opts: {
    files?: string[];
    extraFiles?: Record<string, string>;
  }): Promise<string> {
    const sourcePath = pathx.posix(path.join(tmpDir, "source-pkg"));
    await fs.promises.mkdir(sourcePath, { recursive: true });

    // package.json
    const pkgJson: Record<string, unknown> = { name: "@test/pkg", version: "1.0.0" };
    if (opts.files != null) {
      pkgJson["files"] = opts.files;
    }
    await fs.promises.writeFile(
      pathx.posix(path.join(sourcePath, "package.json")),
      JSON.stringify(pkgJson),
    );

    // 기본 디렉토리/파일 생성
    await fs.promises.mkdir(pathx.posix(path.join(sourcePath, "dist")), { recursive: true });
    await fs.promises.writeFile(
      pathx.posix(path.join(sourcePath, "dist", "index.js")),
      "module.exports = {};",
    );
    await fs.promises.mkdir(pathx.posix(path.join(sourcePath, "src")), { recursive: true });
    await fs.promises.writeFile(
      pathx.posix(path.join(sourcePath, "src", "index.ts")),
      "export const v = 1;",
    );
    // files에 없는 파일들
    await fs.promises.writeFile(
      pathx.posix(path.join(sourcePath, "tsconfig.json")),
      "{}",
    );
    await fs.promises.writeFile(
      pathx.posix(path.join(sourcePath, "CLAUDE.md")),
      "# CLAUDE",
    );

    // 추가 파일
    if (opts.extraFiles != null) {
      for (const [relPath, content] of Object.entries(opts.extraFiles)) {
        const fullPath = pathx.posix(path.join(sourcePath, relPath));
        await fs.promises.mkdir(pathx.posix(path.dirname(fullPath)), { recursive: true });
        await fs.promises.writeFile(fullPath, content);
      }
    }

    return sourcePath;
  }

  it("files에 포함된 디렉토리가 복사되고, files에 없는 파일은 복사되지 않는다", async () => {
    const sourcePath = await createSourcePkg({ files: ["dist", "src"] });
    const projectRoot = pathx.posix(path.join(tmpDir, "project"));
    const targetPkgDir = pathx.posix(
      path.join(projectRoot, "node_modules", "@test", "pkg"),
    );

    await setupReplaceDeps(projectRoot, { "@test/pkg": sourcePath });

    // files에 포함된 디렉토리가 복사됨
    expect(fs.existsSync(pathx.posix(path.join(targetPkgDir, "dist", "index.js")))).toBe(true);
    expect(fs.existsSync(pathx.posix(path.join(targetPkgDir, "src", "index.ts")))).toBe(true);

    // files에 없는 파일은 복사되지 않음
    expect(fs.existsSync(pathx.posix(path.join(targetPkgDir, "tsconfig.json")))).toBe(false);
    expect(fs.existsSync(pathx.posix(path.join(targetPkgDir, "CLAUDE.md")))).toBe(false);
  });

  it("npm 기본 포함 파일(README, LICENSE)은 files에 없어도 복사된다", async () => {
    const sourcePath = await createSourcePkg({
      files: ["dist", "src"],
      extraFiles: {
        "README.md": "# README",
        "LICENSE": "MIT License",
      },
    });
    const projectRoot = pathx.posix(path.join(tmpDir, "project"));
    const targetPkgDir = pathx.posix(
      path.join(projectRoot, "node_modules", "@test", "pkg"),
    );

    await setupReplaceDeps(projectRoot, { "@test/pkg": sourcePath });

    expect(fs.existsSync(pathx.posix(path.join(targetPkgDir, "README.md")))).toBe(true);
    expect(fs.existsSync(pathx.posix(path.join(targetPkgDir, "LICENSE")))).toBe(true);
  });

  it("package.json은 복사되지 않고 대상의 기존 package.json이 보존된다", async () => {
    const sourcePath = await createSourcePkg({ files: ["dist", "src"] });
    const projectRoot = pathx.posix(path.join(tmpDir, "project"));
    const targetPkgDir = pathx.posix(
      path.join(projectRoot, "node_modules", "@test", "pkg"),
    );

    await setupReplaceDeps(projectRoot, { "@test/pkg": sourcePath });

    // 대상의 기존 package.json이 보존됨 (소스의 것으로 덮어씌워지지 않음)
    const targetPkgJson = JSON.parse(
      fs.readFileSync(pathx.posix(path.join(targetPkgDir, "package.json")), "utf-8"),
    );
    expect(targetPkgJson.version).toBe("2.0.0");
  });

  it("files 필드가 없는 패키지는 건너뛰고 복사하지 않는다", async () => {
    const sourcePath = await createSourcePkg({ files: undefined });
    const projectRoot = pathx.posix(path.join(tmpDir, "project"));
    const targetPkgDir = pathx.posix(
      path.join(projectRoot, "node_modules", "@test", "pkg"),
    );

    await setupReplaceDeps(projectRoot, { "@test/pkg": sourcePath });

    // 복사가 수행되지 않음
    expect(fs.existsSync(pathx.posix(path.join(targetPkgDir, "dist")))).toBe(false);
    expect(fs.existsSync(pathx.posix(path.join(targetPkgDir, "src")))).toBe(false);
  });
});
