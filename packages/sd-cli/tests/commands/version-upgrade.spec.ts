import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { upgradeVersion, computePublishLevels } from "../../src/commands/publish/version-upgrade";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "sd-cli-vu-unit-"));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

describe("upgradeVersion — unit", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("prerelease 버전은 prerelease로 증가한다", async () => {
    writeJson(path.join(tmpDir, "package.json"), {
      name: "@simplysm/root",
      version: "14.0.0-beta.3",
    });
    fs.mkdirSync(path.join(tmpDir, "packages", "sd-cli", "templates"), {
      recursive: true,
    });

    const result = await upgradeVersion(tmpDir, [], false);
    expect(result.version).toBe("14.0.0-beta.4");
  });

  it("dryRun이면 파일을 수정하지 않고 새 버전만 반환한다", async () => {
    writeJson(path.join(tmpDir, "package.json"), {
      name: "@simplysm/root",
      version: "14.0.0",
    });

    const pkgDir = path.join(tmpDir, "packages", "pkg-a");
    writeJson(path.join(pkgDir, "package.json"), {
      name: "@simplysm/pkg-a",
      version: "14.0.0",
    });

    const result = await upgradeVersion(tmpDir, [pkgDir], true);
    expect(result.version).toBe("14.0.1");
    expect(result.changedFiles).toHaveLength(0);

    // 파일이 수정되지 않았는지 확인
    const rootPkg = readJson<{ version: string }>(path.join(tmpDir, "package.json"));
    expect(rootPkg.version).toBe("14.0.0");
  });

  it("템플릿 파일에서 @simplysm 버전이 없으면 수정하지 않는다", async () => {
    writeJson(path.join(tmpDir, "package.json"), {
      name: "@simplysm/root",
      version: "14.0.0",
    });

    const templatesDir = path.join(tmpDir, "packages", "sd-cli", "templates");
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(path.join(templatesDir, "no-version.hbs"), "plain template content", "utf-8");

    const result = await upgradeVersion(tmpDir, [], false);
    const templateChanges = result.changedFiles.filter((f) => f.endsWith(".hbs"));
    expect(templateChanges).toHaveLength(0);

    // 파일이 수정되지 않았는지 확인
    expect(fs.readFileSync(path.join(templatesDir, "no-version.hbs"), "utf-8")).toBe(
      "plain template content",
    );
  });
});

describe("computePublishLevels — unit", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("의존성 없는 패키지들은 모두 Level 0이다", async () => {
    const publishPkgs = ["pkg-a", "pkg-b", "pkg-c"].map((name) => {
      const pkgDir = path.join(tmpDir, "packages", name);
      writeJson(path.join(pkgDir, "package.json"), {
        name: `@simplysm/${name}`,
        version: "14.0.0",
        dependencies: {},
      });
      return { name, path: pkgDir };
    });

    const levels = await computePublishLevels(publishPkgs);
    expect(levels).toHaveLength(1);
    expect(levels[0].map((p) => p.name).sort()).toEqual(["pkg-a", "pkg-b", "pkg-c"]);
  });

  it("외부 의존성(@simplysm/ 아닌)은 레벨 계산에 영향 없다", async () => {
    const pkgDir = path.join(tmpDir, "packages", "pkg-a");
    writeJson(path.join(pkgDir, "package.json"), {
      name: "@simplysm/pkg-a",
      version: "14.0.0",
      dependencies: { lodash: "^4.0.0", express: "^5.0.0" },
    });

    const levels = await computePublishLevels([{ name: "pkg-a", path: pkgDir }]);
    expect(levels).toHaveLength(1);
    expect(levels[0][0].name).toBe("pkg-a");
  });

  it("peerDependencies와 optionalDependencies도 레벨에 반영된다", async () => {
    const pkgADir = path.join(tmpDir, "packages", "pkg-a");
    writeJson(path.join(pkgADir, "package.json"), {
      name: "@simplysm/pkg-a",
      version: "14.0.0",
    });

    const pkgBDir = path.join(tmpDir, "packages", "pkg-b");
    writeJson(path.join(pkgBDir, "package.json"), {
      name: "@simplysm/pkg-b",
      version: "14.0.0",
      peerDependencies: { "@simplysm/pkg-a": "~14.0.0" },
    });

    const levels = await computePublishLevels([
      { name: "pkg-a", path: pkgADir },
      { name: "pkg-b", path: pkgBDir },
    ]);
    expect(levels).toHaveLength(2);
    expect(levels[0][0].name).toBe("pkg-a");
    expect(levels[1][0].name).toBe("pkg-b");
  });
});
