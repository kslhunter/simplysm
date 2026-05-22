import type { ServerBuildInfo } from "../../workers/server-build.worker";
import path from "path";
import fs from "fs";
import YAML from "yaml";
import TOML from "smol-toml";
import { cpx } from "@simplysm/core-node";
import { createLogger } from "@simplysm/core-common";
import { collectAllDependencyExternals } from "../../esbuild/esbuild-config";

const logger = createLogger("sd:cli:server-production-files");

/**
 * 외부 모듈을 두 용도로 분리하여 수집한다.
 * - bundleExternals: esbuild external — 번들에서 제외할 패키지
 * - prodDependencies: dist/package.json dependencies — 런타임에 실제 설치되어야 하는 패키지
 *
 * 미설치 optional peer는 번들 제외만 필요할 뿐 런타임에 쓰이지 않으므로 prodDependencies에 포함하지 않는다.
 */
export function collectAllExternals(
  pkgDir: string,
  manualExternals?: string[],
): { bundleExternals: string[]; prodDependencies: string[] } {
  logger.debug("의존성 트리 스캔 중...");
  const { optionalPeerDeps, nativeModules } = collectAllDependencyExternals(pkgDir);

  const manual = manualExternals ?? [];
  return {
    bundleExternals: [...new Set([...optionalPeerDeps, ...nativeModules, ...manual])],
    prodDependencies: [...new Set([...nativeModules, ...manual])],
  };
}

/**
 * pnpm-lock.yaml의 packages 섹션을 파싱하여 name→version 맵을 생성한다.
 * 키 형태: "name@version" · "@scope/name@version" · "name@version(peer@ver)..."
 */
export function parseLockfileVersions(cwd: string): Map<string, string> {
  const lockfilePath = path.join(cwd, "pnpm-lock.yaml");
  if (!fs.existsSync(lockfilePath)) {
    throw new Error(`pnpm-lock.yaml not found in ${cwd}. Run "pnpm install" first.`);
  }

  const content = fs.readFileSync(lockfilePath, "utf-8");
  const parsed = YAML.parse(content) as { packages?: Record<string, unknown> };
  const map = new Map<string, string>();

  for (const key of Object.keys(parsed.packages ?? {})) {
    // 첫 번째 @숫자 기준으로 name / version 분리 (scope 패키지의 선두 @ 보존)
    const m = /^(.+?)@(\d.+)$/.exec(key);
    if (m == null) continue;
    const name = m[1];
    // peerDep suffix "(peer@ver)..." 제거
    const parenIdx = m[2].indexOf("(");
    const version = parenIdx === -1 ? m[2] : m[2].substring(0, parenIdx);
    if (!map.has(name)) {
      map.set(name, version);
    }
  }

  return map;
}

/**
 * pnpm-lock.yaml에서 주어진 모든 패키지의 잠긴 버전을 확인한다.
 * lockfile에서 패키지를 찾을 수 없으면 에러를 던진다.
 */
export function resolveLockedVersions(cwd: string, pkgNames: string[]): Record<string, string> {
  const versionMap = parseLockfileVersions(cwd);
  const result: Record<string, string> = {};
  for (const name of pkgNames) {
    const version = versionMap.get(name);
    if (version == null) {
      throw new Error(
        `External dependency "${name}" not found in pnpm-lock.yaml. ` +
          `Run "pnpm install" and try again.`,
      );
    }
    result[name] = version;
  }
  return result;
}

/**
 * 프로덕션 배포용 파일을 생성한다
 */
export function generateProductionFiles(
  info: ServerBuildInfo,
  externals: string[],
): void {
  const distDir = path.join(info.pkgDir, "dist");
  const pkgJson = JSON.parse(fs.readFileSync(path.join(info.pkgDir, "package.json"), "utf-8"));

  // dist/package.json
  const distPkgJson: Record<string, unknown> = {
    name: pkgJson.name,
    version: pkgJson.version,
    type: pkgJson.type,
  };
  if (externals.length > 0) {
    distPkgJson["dependencies"] = resolveLockedVersions(info.cwd, externals);
  }
  if (info.packageManager === "volta") {
    const nodeVersion = cpx.spawnSync("node", ["-v"]).stdout.trim();
    distPkgJson["volta"] = { node: nodeVersion };
  }
  fs.writeFileSync(path.join(distDir, "package.json"), JSON.stringify(distPkgJson, undefined, 2));

  // dist/mise.toml
  if (info.packageManager === "mise") {
    const rootMiseTomlPath = path.join(info.cwd, "mise.toml");
    let nodeVersion = "20";
    if (fs.existsSync(rootMiseTomlPath)) {
      const miseContent = fs.readFileSync(rootMiseTomlPath, "utf-8");
      // mise.toml은 저장소에서 관리되는 설정 파일이므로, 파싱 실패 시 폴백하지 않고 예외를 전파하여 설정 오류를 즉시 드러낸다.
      const miseConfig = TOML.parse(miseContent) as { tools?: { node?: string } };
      if (miseConfig.tools?.node != null) {
        nodeVersion = miseConfig.tools.node;
      }
    }
    fs.writeFileSync(path.join(distDir, "mise.toml"), `[tools]\nnode = "${nodeVersion}"\n`);
  }

  // dist/openssl.cnf
  fs.writeFileSync(
    path.join(distDir, "openssl.cnf"),
    [
      "nodejs_conf = openssl_init",
      "",
      "[openssl_init]",
      "providers = provider_sect",
      "ssl_conf = ssl_sect",
      "",
      "[provider_sect]",
      "default = default_sect",
      "legacy = legacy_sect",
      "",
      "[default_sect]",
      "activate = 1",
      "",
      "[legacy_sect]",
      "activate = 1",
      "",
      "[ssl_sect]",
      "system_default = system_default_sect",
      "",
      "[system_default_sect]",
      "Options = UnsafeLegacyRenegotiation",
    ].join("\n"),
  );

  // dist/pm2.config.cjs
  if (info.pm2 != null) {
    const pm2Name = info.pm2.name ?? pkgJson.name.replace(/@/g, "").replace(/[/\\]/g, "-");
    const ignoreWatch = JSON.stringify([
      "node_modules",
      "www",
      ...(info.pm2.ignoreWatchPaths ?? []),
    ]);
    const envObj: Record<string, string> = {
      NODE_ENV: "production",
      TZ: "Asia/Seoul",
      ...(info.env ?? {}),
    };
    const envStr = JSON.stringify(envObj, undefined, 4);

    const useInterpreter = info.packageManager !== "volta";

    const pm2Config = [
      ...(useInterpreter ? [`const cp = require("child_process");`, ``] : []),
      `module.exports = {`,
      `  name: ${JSON.stringify(pm2Name)},`,
      `  script: "main.js",`,
      `  watch: true,`,
      `  watch_delay: 2000,`,
      `  ignore_watch: ${ignoreWatch},`,
      ...(useInterpreter ? [`  interpreter: cp.execSync("mise which node").toString().trim(),`] : []),
      `  interpreter_args: "--openssl-config=openssl.cnf",`,
      `  env: ${envStr.replace(/\n/g, "\n  ")},`,
      `  arrayProcess: "concat",`,
      `  useDelTargetNull: true,`,
      `};`,
    ].join("\n");

    fs.writeFileSync(path.join(distDir, "pm2.config.cjs"), pm2Config);
  }
}
