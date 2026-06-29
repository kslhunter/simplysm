import path from "path";
import { createRequire } from "module";
import { consola, LogLevels } from "consola";
import { fsx, pathx } from "@simplysm/core-node";
import { createLogger } from "@simplysm/core-common";
import { shellSpawn } from "../utils/shell-spawn";
import { findWorkspaceRoot } from "../utils/workspace-utils";
import type { NpmConfig, SdCapacitorConfig } from "../sd-config.types.js";

const logger = createLogger("sd:cli:capacitor:npm-config");

/**
 * .capacitor/package.json을 구성하고 의존성 변경 여부를 반환한다.
 */
export async function setupCapNpmConfig(
  capPath: string,
  pkgPath: string,
  config: SdCapacitorConfig,
  npmConfig: NpmConfig,
  platforms: string[],
  exclude: string[],
): Promise<boolean> {
  const workspaceRoot = findWorkspaceRoot(pkgPath);
  if (workspaceRoot == null) throw new Error(`워크스페이스 루트를 찾을 수 없습니다: ${pkgPath}`);
  const projNpmConfigPath = pathx.posixResolve(workspaceRoot, "package.json");

  if (!(await fsx.exists(projNpmConfigPath))) {
    throw new Error(`루트 package.json을 찾을 수 없습니다: ${projNpmConfigPath}`);
  }

  const projNpmConfig = await fsx.readJson<NpmConfig>(projNpmConfigPath);

  const capNpmConfPath = pathx.posixResolve(capPath, "package.json");
  const orgCapNpmConf: NpmConfig = (await fsx.exists(capNpmConfPath))
    ? await fsx.readJson<NpmConfig>(capNpmConfPath)
    : { name: "", version: "" };

  const capNpmConf: NpmConfig = { ...orgCapNpmConf };
  capNpmConf.name = config.appId;
  capNpmConf.version = npmConfig.version;
  if (projNpmConfig.volta != null) {
    capNpmConf.volta = projNpmConfig.volta;
  }

  // 기본 의존성
  capNpmConf.dependencies = capNpmConf.dependencies ?? {};
  capNpmConf.dependencies["@capacitor/core"] = "^8";
  capNpmConf.dependencies["@capacitor/app"] = "^8";
  for (const platform of platforms) {
    capNpmConf.dependencies[`@capacitor/${platform}`] = "^8";
  }

  capNpmConf.devDependencies = capNpmConf.devDependencies ?? {};
  capNpmConf.devDependencies["@capacitor/cli"] = "^8";
  capNpmConf.devDependencies["@capacitor/assets"] = "^3";

  // 플러그인 패키지 설정
  const mainDeps = {
    ...npmConfig.dependencies,
    ...npmConfig.devDependencies,
    ...npmConfig.peerDependencies,
  };

  const usePlugins = Object.keys(config.plugins ?? {});

  const prevPlugins = Object.keys(capNpmConf.dependencies).filter(
    (item) =>
      !["@capacitor/core", "@capacitor/android", "@capacitor/ios", "@capacitor/app"].includes(
        item,
      ),
  );

  // 사용하지 않는 플러그인 제거
  for (const prevPlugin of prevPlugins) {
    if (!usePlugins.includes(prevPlugin)) {
      delete capNpmConf.dependencies[prevPlugin];
      logger.debug(`플러그인 제거: ${prevPlugin}`);
    }
  }

  // 새 플러그인 추가
  const pkgRequire = createRequire(pathx.posixResolve(pkgPath, "package.json"));
  for (const plugin of usePlugins) {
    const version = mainDeps[plugin] ?? "*";
    if (typeof version === "string" && version.startsWith("workspace:")) {
      const pluginPkgJsonPath = pkgRequire.resolve(`${plugin}/package.json`);
      const pluginDir = path.dirname(pluginPkgJsonPath);
      const relativePath = pathx.posix(path.relative(capPath, pluginDir));
      capNpmConf.dependencies[plugin] = `link:${relativePath}`;
      logger.debug(`workspace 플러그인 (link): ${plugin} → ${relativePath}`);
    } else if (!(plugin in capNpmConf.dependencies)) {
      capNpmConf.dependencies[plugin] = version;
      logger.debug(`플러그인 추가: ${plugin}@${version}`);
    }
  }

  // exclude 패키지 추가
  for (const excludePkg of exclude) {
    if (!(excludePkg in capNpmConf.dependencies)) {
      const version = mainDeps[excludePkg] ?? "*";
      capNpmConf.dependencies[excludePkg] = version;
      logger.debug(`exclude 패키지 추가: ${excludePkg}@${version}`);
    }
  }

  // 저장
  await fsx.mkdir(capPath);
  await fsx.writeJson(capNpmConfPath, capNpmConf, { space: 2 });

  // 의존성 변경 여부 확인
  return (
    orgCapNpmConf.volta !== capNpmConf.volta ||
    JSON.stringify(orgCapNpmConf.dependencies) !== JSON.stringify(capNpmConf.dependencies) ||
    JSON.stringify(orgCapNpmConf.devDependencies) !== JSON.stringify(capNpmConf.devDependencies)
  );
}

/**
 * Capacitor 프로젝트 NPM 초기화 (bun install, cap init, www placeholder).
 * 의존성 변경 시 true를 반환한다.
 */
export async function initCapNpmProject(
  capPath: string,
  pkgPath: string,
  config: SdCapacitorConfig,
  npmConfig: NpmConfig,
  platforms: string[],
  exclude: string[],
): Promise<boolean> {
  logger.debug("package.json 설정 시작");
  const depChanged = await setupCapNpmConfig(capPath, pkgPath, config, npmConfig, platforms, exclude);
  const nodeModulesExists = await fsx.exists(pathx.posixResolve(capPath, "node_modules"));
  logger.debug(`depChanged: ${depChanged}, nodeModulesExists: ${nodeModulesExists}`);

  if (!depChanged && nodeModulesExists) {
    logger.debug("의존성 변경 없음");
    return false;
  }

  // bun install
  const isDebug = consola.level >= LogLevels.debug;
  logger.debug("bun install 시작");
  await shellSpawn("bun", ["install"], {
    cwd: capPath,
    ...(isDebug ? { stdio: ["ignore", "inherit", "inherit"] } : {}),
  });
  logger.debug("bun install 완료");

  // 멱등성: capacitor.config.ts가 없을 때만 cap init 실행
  const configPath = pathx.posixResolve(capPath, "capacitor.config.ts");
  if (!(await fsx.exists(configPath))) {
    logger.debug("cap init 시작");
    await shellSpawn("bun", ["run", "cap", "init", config.appId, config.appId], {
      cwd: capPath,
      ...(isDebug ? { stdio: ["ignore", "inherit", "inherit"] } : {}),
    });
    logger.debug("cap init 완료");
  }

  // www/index.html placeholder (cap sync/copy에 필요, 이미 존재하면 유지)
  const wwwPath = pathx.posixResolve(capPath, "www");
  await fsx.mkdir(wwwPath);
  const wwwIndexPath = pathx.posixResolve(wwwPath, "index.html");
  if (!(await fsx.exists(wwwIndexPath))) {
    await fsx.write(
      wwwIndexPath,
      "<!DOCTYPE html><html><head></head><body></body></html>",
    );
  }

  return true;
}
