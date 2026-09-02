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
