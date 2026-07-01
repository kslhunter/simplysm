import path from "path";
import semver from "semver";
import { fsx } from "@simplysm/core-node";
import { json } from "@simplysm/core-common";

/**
 * package.json 타입 (필수 필드만)
 */
export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/**
 * bun.lock의 workspaces 섹션에 스냅샷된 각 워크스페이스 패키지 version을 새 버전으로 맞춘다.
 *
 * bun publish/pack은 `workspace:*` 의존성을 치환할 때 대상 패키지의 package.json이 아니라
 * bun.lock의 `workspaces.<dir>.version`을 읽는다 (bun 1.2.8+, oven-sh/bun#20477). 또한 version만
 * bump하면 `bun install`이 lock의 워크스페이스 version을 갱신하지 않으므로 (oven-sh/bun#18906),
 * package.json만 올리면 lock이 뒤처져 이전 버전으로 치환된다. 이를 막기 위해 lock을 직접 맞춘다.
 *
 * `"version"` 키는 workspaces 섹션에만 나타나므로(packages 섹션의 의존성은 `"name@ver"` 배열 형태),
 * workspaces 객체 범위 안의 `"version"` 값만 새 버전으로 치환한다. 값이 아닌 위치 기준이라
 * lock이 몇 버전 뒤처져 있든 정확히 맞춰진다.
 */
function syncBunLockWorkspaceVersions(content: string, newVersion: string): string {
  const wsKeyIdx = content.indexOf('"workspaces":');
  if (wsKeyIdx === -1) return content;

  const braceStart = content.indexOf("{", wsKeyIdx);
  if (braceStart === -1) return content;

  // balanced brace로 workspaces 객체의 끝을 찾는다 (값 문자열에 중괄호가 없어 안전).
  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < content.length; i++) {
    const ch = content[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        braceEnd = i;
        break;
      }
    }
  }
  if (braceEnd === -1) return content;

  const section = content.slice(braceStart, braceEnd + 1);
  const newSection = section.replace(/("version"\s*:\s*)"[^"]*"/g, `$1"${newVersion}"`);
  return content.slice(0, braceStart) + newSection + content.slice(braceEnd + 1);
}

/**
 * 프로젝트 및 패키지 버전 업그레이드
 * @param dryRun true이면 파일을 수정하지 않고 새 버전만 계산
 */
export async function upgradeVersion(
  cwd: string,
  allPkgPaths: string[],
  dryRun: boolean,
): Promise<{ version: string; changedFiles: string[] }> {
  const changedFiles: string[] = [];
  const projPkgPath = path.resolve(cwd, "package.json");
  const projPkg = await fsx.readJson<PackageJson>(projPkgPath);

  const currentVersion = projPkg.version;
  const prereleaseInfo = semver.prerelease(currentVersion);

  // 프리릴리스 여부에 따라 증가 전략 결정
  const newVersion =
    prereleaseInfo != null
      ? semver.inc(currentVersion, "prerelease")!
      : semver.inc(currentVersion, "patch")!;

  if (dryRun) {
    // dry-run: 파일을 수정하지 않고 새 버전만 반환
    return { version: newVersion, changedFiles: [] };
  }

  projPkg.version = newVersion;
  await fsx.write(projPkgPath, json.stringify(projPkg, { space: 2 }) + "\n");
  changedFiles.push(projPkgPath);

  // 각 패키지의 package.json에 버전 설정 (병렬)
  const pkgChangedFiles = await Promise.all(
    allPkgPaths.map(async (pkgPath) => {
      const pkgJsonPath = path.resolve(pkgPath, "package.json");
      const pkgJson = await fsx.readJson<PackageJson>(pkgJsonPath);
      pkgJson.version = newVersion;
      await fsx.write(pkgJsonPath, json.stringify(pkgJson, { space: 2 }) + "\n");
      return pkgJsonPath;
    }),
  );
  changedFiles.push(...pkgChangedFiles);

  // bun.lock의 워크스페이스 version 동기화 (bun publish가 lock을 읽어 workspace:* 를 치환하므로)
  const bunLockPath = path.resolve(cwd, "bun.lock");
  if (await fsx.exists(bunLockPath)) {
    const lockContent = await fsx.read(bunLockPath);
    const newLockContent = syncBunLockWorkspaceVersions(lockContent, newVersion);
    if (newLockContent !== lockContent) {
      await fsx.write(bunLockPath, newLockContent);
      changedFiles.push(bunLockPath);
    }
  }

  // 템플릿 파일의 @simplysm 패키지 버전 동기화
  const templateFiles = await fsx.glob(path.resolve(cwd, "packages/sd-cli/templates/**/*.hbs"));
  const versionRegex = /("@simplysm\/[^"]+"\s*:\s*)"~[^"]+"/g;

  const templateChangedFiles = await Promise.all(
    templateFiles.map(async (templatePath) => {
      const content = await fsx.read(templatePath);
      const newContent = content.replace(versionRegex, `$1"~${newVersion}"`);

      if (content !== newContent) {
        await fsx.write(templatePath, newContent);
        return templatePath;
      }
      return undefined;
    }),
  );
  changedFiles.push(...templateChangedFiles.filter((f) => f != null));

  const pluginManifestPaths = await fsx.glob(
    path.resolve(cwd, "plugins/*/*-plugin/plugin.json"),
    { dot: true },
  );
  const pluginManifestChangedFiles = await Promise.all(
    pluginManifestPaths.map(async (pluginManifestPath) => {
      const pluginManifest = await fsx.readJson<{ version: string }>(pluginManifestPath);
      pluginManifest.version = newVersion;
      await fsx.write(pluginManifestPath, json.stringify(pluginManifest, { space: 2 }) + "\n");
      return pluginManifestPath;
    }),
  );
  changedFiles.push(...pluginManifestChangedFiles);

  return { version: newVersion, changedFiles };
}

/**
 * 배포할 패키지의 의존성 레벨을 계산한다.
 * 의존성이 없는 패키지 → Level 0, Level 0에만 의존하는 패키지 → Level 1, ...
 */
export async function computePublishLevels<T extends { name: string; path: string }>(
  publishPkgs: T[],
): Promise<T[][]> {
  const pkgNames = new Set(publishPkgs.map((p) => p.name));

  // 각 패키지의 워크스페이스 의존성 수집 (병렬)
  const depsEntries = await Promise.all(
    publishPkgs.map(async (pkg) => {
      const pkgJson = await fsx.readJson<PackageJson>(path.resolve(pkg.path, "package.json"));
      const allDeps = {
        ...pkgJson.dependencies,
        ...pkgJson.peerDependencies,
        ...pkgJson.optionalDependencies,
      };

      const workspaceDeps = new Set<string>();
      for (const depName of Object.keys(allDeps)) {
        const shortName = depName.replace(/^@simplysm\//, "");
        if (shortName !== depName && pkgNames.has(shortName)) {
          workspaceDeps.add(shortName);
        }
      }
      return [pkg.name, workspaceDeps] as const;
    }),
  );
  const depsMap = new Map(depsEntries);

  // 위상 정렬로 레벨 분류
  const levels: T[][] = [];
  const assigned = new Set<string>();
  const remaining = new Map(publishPkgs.map((p) => [p.name, p]));

  while (remaining.size > 0) {
    const level: T[] = [];
    for (const [name, pkg] of remaining) {
      const deps = depsMap.get(name)!;
      if ([...deps].every((d) => assigned.has(d))) {
        level.push(pkg);
      }
    }

    if (level.length === 0) {
      // 순환 의존성 — 나머지 패키지를 마지막 레벨에 배치
      levels.push([...remaining.values()]);
      break;
    }

    for (const pkg of level) {
      assigned.add(pkg.name);
      remaining.delete(pkg.name);
    }
    levels.push(level);
  }

  return levels;
}
