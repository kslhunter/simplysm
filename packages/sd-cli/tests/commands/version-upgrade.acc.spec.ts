import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { upgradeVersion, computePublishLevels } from "../../src/commands/publish/version-upgrade";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sd-cli-version-upgrade-"));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

describe("upgradeVersion", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("복수 패키지의 package.json을 병렬 업데이트한다", async () => {
    // Given: allPkgPaths에 5개 패키지 경로가 있다
    writeJson(path.join(tmpDir, "package.json"), {
      name: "@simplysm/root",
      version: "14.0.0",
    });

    const pkgNames = ["pkg-a", "pkg-b", "pkg-c", "pkg-d", "pkg-e"];
    const allPkgPaths = pkgNames.map((name) => {
      const pkgDir = path.join(tmpDir, "packages", name);
      writeJson(path.join(pkgDir, "package.json"), {
        name: `@simplysm/${name}`,
        version: "14.0.0",
      });
      return pkgDir;
    });

    // sd-cli/templates 디렉토리 생성 (glob 대상이 없도록)
    fs.mkdirSync(path.join(tmpDir, "packages", "sd-cli", "templates"), {
      recursive: true,
    });

    // When
    const result = await upgradeVersion(tmpDir, allPkgPaths, false);

    // Then: 5개 패키지의 package.json이 모두 newVersion으로 업데이트된다
    expect(result.version).toBe("14.0.1");
    for (const pkgDir of allPkgPaths) {
      const pkg = readJson<{ version: string }>(path.join(pkgDir, "package.json"));
      expect(pkg.version).toBe("14.0.1");
    }

    // And: changedFiles에 5개 패키지 경로가 모두 포함된다
    for (const pkgDir of allPkgPaths) {
      expect(result.changedFiles).toContain(path.resolve(pkgDir, "package.json"));
    }
  });

  it("패키지가 없으면 루트 package.json만 changedFiles에 포함된다", async () => {
    // Given: allPkgPaths가 빈 배열이다
    writeJson(path.join(tmpDir, "package.json"), {
      name: "@simplysm/root",
      version: "14.0.0",
    });
    fs.mkdirSync(path.join(tmpDir, "packages", "sd-cli", "templates"), {
      recursive: true,
    });

    // When
    const result = await upgradeVersion(tmpDir, [], false);

    // Then: 루트 package.json만 changedFiles에 포함된다
    expect(result.changedFiles).toHaveLength(1);
    expect(result.changedFiles[0]).toBe(path.resolve(tmpDir, "package.json"));
  });

  it("복수 템플릿 파일을 병렬 업데이트한다", async () => {
    // Given: 템플릿 3개 중 2개에 @simplysm 버전이 포함되어 있다
    writeJson(path.join(tmpDir, "package.json"), {
      name: "@simplysm/root",
      version: "14.0.0",
    });

    const templatesDir = path.join(tmpDir, "packages", "sd-cli", "templates");
    fs.mkdirSync(templatesDir, { recursive: true });

    // 템플릿 1: @simplysm 버전 포함
    fs.writeFileSync(
      path.join(templatesDir, "a.hbs"),
      `"@simplysm/core-common": "~14.0.0"`,
      "utf-8",
    );
    // 템플릿 2: @simplysm 버전 포함
    fs.writeFileSync(
      path.join(templatesDir, "b.hbs"),
      `"@simplysm/angular": "~14.0.0"`,
      "utf-8",
    );
    // 템플릿 3: @simplysm 버전 미포함
    fs.writeFileSync(path.join(templatesDir, "c.hbs"), `no version here`, "utf-8");

    // When
    const result = await upgradeVersion(tmpDir, [], false);

    // Then: 2개 파일만 수정되고 changedFiles에 추가된다
    const templateChanges = result.changedFiles.filter((f) => f.endsWith(".hbs"));
    expect(templateChanges).toHaveLength(2);

    // 수정된 파일들의 내용 확인
    expect(fs.readFileSync(path.join(templatesDir, "a.hbs"), "utf-8")).toContain("~14.0.1");
    expect(fs.readFileSync(path.join(templatesDir, "b.hbs"), "utf-8")).toContain("~14.0.1");
    // 수정되지 않은 파일
    expect(fs.readFileSync(path.join(templatesDir, "c.hbs"), "utf-8")).toBe("no version here");
  });

  it("템플릿이 없으면 템플릿 관련 쓰기 없이 완료된다", async () => {
    // Given: glob 결과가 빈 배열이다 (templates 디렉토리에 .hbs 파일 없음)
    writeJson(path.join(tmpDir, "package.json"), {
      name: "@simplysm/root",
      version: "14.0.0",
    });
    fs.mkdirSync(path.join(tmpDir, "packages", "sd-cli", "templates"), {
      recursive: true,
    });

    // When
    const result = await upgradeVersion(tmpDir, [], false);

    // Then
    const templateChanges = result.changedFiles.filter((f) => f.endsWith(".hbs"));
    expect(templateChanges).toHaveLength(0);
  });

  it("changedFiles[0]이 프로젝트 루트 package.json 경로이다", async () => {
    // Given: allPkgPaths에 3개 패키지가 있다
    writeJson(path.join(tmpDir, "package.json"), {
      name: "@simplysm/root",
      version: "14.0.0",
    });

    const allPkgPaths = ["pkg-a", "pkg-b", "pkg-c"].map((name) => {
      const pkgDir = path.join(tmpDir, "packages", name);
      writeJson(path.join(pkgDir, "package.json"), {
        name: `@simplysm/${name}`,
        version: "14.0.0",
      });
      return pkgDir;
    });

    fs.mkdirSync(path.join(tmpDir, "packages", "sd-cli", "templates"), {
      recursive: true,
    });

    // When
    const result = await upgradeVersion(tmpDir, allPkgPaths, false);

    // Then: changedFiles[0]이 프로젝트 루트 package.json 경로이다
    expect(result.changedFiles[0]).toBe(path.resolve(tmpDir, "package.json"));
  });
});

describe("computePublishLevels", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("의존 관계가 있는 패키지들의 레벨을 올바르게 계산한다", async () => {
    // Given: A(의존 없음), B(A 의존), C(B 의존)
    const pkgs = [
      { name: "pkg-a", deps: {} },
      { name: "pkg-b", deps: { "@simplysm/pkg-a": "~14.0.0" } },
      { name: "pkg-c", deps: { "@simplysm/pkg-b": "~14.0.0" } },
    ];

    const publishPkgs = pkgs.map((p) => {
      const pkgDir = path.join(tmpDir, "packages", p.name);
      writeJson(path.join(pkgDir, "package.json"), {
        name: `@simplysm/${p.name}`,
        version: "14.0.0",
        dependencies: p.deps,
      });
      return { name: p.name, path: pkgDir };
    });

    // When
    const levels = await computePublishLevels(publishPkgs);

    // Then: 레벨은 [[A], [B], [C]]
    expect(levels).toHaveLength(3);
    expect(levels[0].map((p) => p.name)).toEqual(["pkg-a"]);
    expect(levels[1].map((p) => p.name)).toEqual(["pkg-b"]);
    expect(levels[2].map((p) => p.name)).toEqual(["pkg-c"]);
  });
});
