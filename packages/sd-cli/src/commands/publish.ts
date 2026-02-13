import path from "path";
import semver from "semver";
import { consola, LogLevels } from "consola";
import { Listr, type ListrTask } from "listr2";
import { StorageFactory } from "@simplysm/storage";
import { fsExists, fsRead, fsReadJson, fsWrite, fsGlob, fsCopy } from "@simplysm/core-node";
import { env, jsonStringify } from "@simplysm/core-common";
import "@simplysm/core-common";
import type { SdConfig, SdPublishConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { spawn } from "../utils/spawn";
import { runBuild } from "./build";
import os from "os";
import fs from "fs";
import ssh2 from "ssh2";
import { password as passwordPrompt } from "@inquirer/prompts";

const { Client: SshClient, utils } = ssh2;

//#region Types

/**
 * Publish 명령 옵션
 */
export interface PublishOptions {
  /** 배포할 패키지 필터 (빈 배열이면 publish 설정이 있는 모든 패키지) */
  targets: string[];
  /** 빌드 없이 배포 (위험) */
  noBuild: boolean;
  /** 실제 배포 없이 시뮬레이션 */
  dryRun: boolean;
  /** sd.config.ts에 전달할 추가 옵션 */
  options: string[];
}

/**
 * package.json 타입 (필요한 필드만)
 */
interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

//#endregion

//#region Utilities

/**
 * 환경변수 치환 (%VAR% 형식)
 * @throws 치환 결과가 빈 문자열이면 에러
 */
function replaceEnvVariables(str: string, version: string, projectPath: string): string {
  const result = str.replace(/%([^%]+)%/g, (match, envName: string) => {
    if (envName === "VER") {
      return version;
    }
    if (envName === "PROJECT") {
      return projectPath;
    }
    return (env[envName] as string | undefined) ?? match;
  });

  // 치환되지 않은 환경변수가 남아있으면 에러
  if (/%[^%]+%/.test(result)) {
    throw new Error(`환경변수 치환 실패: ${str} → ${result}`);
  }

  return result;
}

/**
 * 카운트다운 대기
 */
async function waitWithCountdown(message: string, seconds: number): Promise<void> {
  for (let i = seconds; i > 0; i--) {
    if (i !== seconds && process.stdout.isTTY) {
      process.stdout.cursorTo(0);
    }
    process.stdout.write(`${message} ${i}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (process.stdout.isTTY) {
    process.stdout.cursorTo(0);
    process.stdout.clearLine(0);
  } else {
    process.stdout.write("\n");
  }
}

/**
 * SSH 키 인증 사전 확인 및 설정
 *
 * pass가 없는 SFTP 서버에 대해:
 * 1. SSH 키 파일이 없으면 생성
 * 2. 키 인증을 테스트하고, 실패하면 비밀번호로 공개키 등록
 */
async function ensureSshAuth(
  publishPackages: Array<{ name: string; config: SdPublishConfig }>,
  logger: ReturnType<typeof consola.withTag>,
): Promise<void> {
  // pass 없는 SFTP 서버 수집 (user@host 중복 제거)
  const sshTargets = new Map<string, { host: string; port?: number; user: string }>();
  for (const pkg of publishPackages) {
    if (pkg.config === "npm") continue;
    if (pkg.config.type !== "sftp") continue;
    if (pkg.config.pass != null) continue;
    if (pkg.config.user == null) {
      throw new Error(`[${pkg.name}] SFTP 설정에 user가 없습니다.`);
    }
    const key = `${pkg.config.user}@${pkg.config.host}`;
    sshTargets.set(key, {
      host: pkg.config.host,
      port: pkg.config.port,
      user: pkg.config.user,
    });
  }

  if (sshTargets.size === 0) return;

  // SSH 키 파일 확인/생성
  const sshDir = path.join(os.homedir(), ".ssh");
  const keyPath = path.join(sshDir, "id_ed25519");
  const pubKeyPath = path.join(sshDir, "id_ed25519.pub");

  if (!fs.existsSync(keyPath)) {
    logger.info("SSH 키가 없습니다. 생성합니다...");

    if (!fs.existsSync(sshDir)) {
      fs.mkdirSync(sshDir, { mode: 0o700 });
    }

    const keyPair = utils.generateKeyPairSync("ed25519");
    fs.writeFileSync(keyPath, keyPair.private, { mode: 0o600 });
    fs.writeFileSync(pubKeyPath, keyPair.public + "\n", { mode: 0o644 });

    logger.info(`SSH 키 생성 완료: ${keyPath}`);
  }

  const privateKeyData = fs.readFileSync(keyPath);
  const publicKey = fs.readFileSync(pubKeyPath, "utf-8").trim();

  // privateKey가 암호화되어 있는지 확인
  const parsed = utils.parseKey(privateKeyData);
  const isKeyEncrypted = parsed instanceof Error;
  const sshAgent = process.env["SSH_AUTH_SOCK"];

  // 각 서버에 대해 키 인증 확인
  for (const [label, target] of sshTargets) {
    const canAuth = await testSshKeyAuth(target, {
      privateKey: isKeyEncrypted ? undefined : privateKeyData,
      agent: sshAgent,
    });
    if (canAuth) {
      logger.debug(`SSH 키 인증 확인: ${label}`);
      continue;
    }

    // 키 인증 실패 → 비밀번호로 공개키 등록
    logger.info(`${label}: SSH 키가 서버에 등록되어 있지 않습니다.`);
    const pass = await passwordPrompt({
      message: `${label} 비밀번호 (공개키 등록용):`,
    });

    await registerSshPublicKey(target, pass, publicKey);
    logger.info(`SSH 공개키 등록 완료: ${label}`);
  }
}

/**
 * SSH 키 인증 테스트 (접속 후 즉시 종료)
 */
function testSshKeyAuth(
  target: { host: string; port?: number; user: string },
  auth: { privateKey?: Buffer; agent?: string },
): Promise<boolean> {
  if (auth.privateKey == null && auth.agent == null) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const conn = new SshClient();
    conn.on("ready", () => {
      conn.end();
      resolve(true);
    });
    conn.on("error", () => {
      resolve(false);
    });
    conn.connect({
      host: target.host,
      port: target.port ?? 22,
      username: target.user,
      ...(auth.privateKey != null ? { privateKey: auth.privateKey } : {}),
      ...(auth.agent != null ? { agent: auth.agent } : {}),
      readyTimeout: 10_000,
    });
  });
}

/**
 * 비밀번호로 서버에 접속하여 SSH 공개키를 등록
 */
function registerSshPublicKey(
  target: { host: string; port?: number; user: string },
  pass: string,
  publicKey: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new SshClient();
    conn.on("ready", () => {
      // authorized_keys에 공개키 추가
      const cmd = [
        "mkdir -p ~/.ssh",
        "chmod 700 ~/.ssh",
        `echo '${publicKey}' >> ~/.ssh/authorized_keys`,
        "chmod 600 ~/.ssh/authorized_keys",
      ].join(" && ");

      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          reject(new Error(`SSH 명령 실행 실패: ${err.message}`));
          return;
        }

        let stderr = "";
        stream.on("data", () => {}); // stdout 소비 (미소비 시 stream 미종료)
        stream.stderr.on("data", (data: Uint8Array) => {
          stderr += data.toString();
        });
        stream.on("exit", (code: number | null) => {
          conn.end();
          if (code !== 0) {
            reject(new Error(`SSH 공개키 등록 실패 (exit code: ${code}): ${stderr}`));
          } else {
            resolve();
          }
        });
      });
    });
    conn.on("error", (err) => {
      reject(new Error(`SSH 접속 실패 (${target.host}): ${err.message}`));
    });
    conn.connect({
      host: target.host,
      port: target.port ?? 22,
      username: target.user,
      password: pass,
      readyTimeout: 10_000,
    });
  });
}

//#endregion

//#region Version Upgrade

/**
 * 프로젝트 및 패키지 버전 업그레이드
 * @param dryRun true면 파일 수정 없이 새 버전만 계산
 */
async function upgradeVersion(
  cwd: string,
  allPkgPaths: string[],
  dryRun: boolean,
): Promise<{ version: string; changedFiles: string[] }> {
  const changedFiles: string[] = [];
  const projPkgPath = path.resolve(cwd, "package.json");
  const projPkg = await fsReadJson<PackageJson>(projPkgPath);

  const currentVersion = projPkg.version;
  const prereleaseInfo = semver.prerelease(currentVersion);

  // prerelease 여부에 따라 증가 방식 결정
  const newVersion =
    prereleaseInfo !== null ? semver.inc(currentVersion, "prerelease")! : semver.inc(currentVersion, "patch")!;

  if (dryRun) {
    // dry-run: 파일 수정 없이 새 버전만 반환
    return { version: newVersion, changedFiles: [] };
  }

  projPkg.version = newVersion;
  await fsWrite(projPkgPath, jsonStringify(projPkg, { space: 2 }) + "\n");
  changedFiles.push(projPkgPath);

  // 각 패키지 package.json 버전 설정
  for (const pkgPath of allPkgPaths) {
    const pkgJsonPath = path.resolve(pkgPath, "package.json");
    const pkgJson = await fsReadJson<PackageJson>(pkgJsonPath);
    pkgJson.version = newVersion;
    await fsWrite(pkgJsonPath, jsonStringify(pkgJson, { space: 2 }) + "\n");
    changedFiles.push(pkgJsonPath);
  }

  // 템플릿 파일의 @simplysm 패키지 버전 동기화
  const templateFiles = await fsGlob(path.resolve(cwd, "packages/sd-cli/templates/**/*.hbs"));
  const versionRegex = /("@simplysm\/[^"]+"\s*:\s*)"~[^"]+"/g;

  for (const templatePath of templateFiles) {
    const content = await fsRead(templatePath);
    const newContent = content.replace(versionRegex, `$1"~${newVersion}"`);

    if (content !== newContent) {
      await fsWrite(templatePath, newContent);
      changedFiles.push(templatePath);
    }
  }

  return { version: newVersion, changedFiles };
}

//#endregion

//#region Package Publishing

/**
 * 개별 패키지 배포
 * @param dryRun true면 실제 배포 없이 시뮬레이션
 */
async function publishPackage(
  pkgPath: string,
  publishConfig: SdPublishConfig,
  version: string,
  projectPath: string,
  logger: ReturnType<typeof consola.withTag>,
  dryRun: boolean,
): Promise<void> {
  const pkgName = path.basename(pkgPath);

  if (publishConfig === "npm") {
    // npm publish
    const prereleaseInfo = semver.prerelease(version);
    const args = ["publish", "--access", "public"];

    if (prereleaseInfo !== null && typeof prereleaseInfo[0] === "string") {
      args.push("--tag", prereleaseInfo[0]);
    }

    if (dryRun) {
      args.push("--dry-run");
      logger.info(`[DRY-RUN] [${pkgName}] pnpm ${args.join(" ")}`);
    } else {
      logger.debug(`[${pkgName}] pnpm ${args.join(" ")}`);
    }

    await spawn("pnpm", args, { cwd: pkgPath });
  } else if (publishConfig.type === "local-directory") {
    // 로컬 디렉토리 복사
    const targetPath = replaceEnvVariables(publishConfig.path, version, projectPath);
    const distPath = path.resolve(pkgPath, "dist");

    if (dryRun) {
      logger.info(`[DRY-RUN] [${pkgName}] 로컬 복사: ${distPath} → ${targetPath}`);
    } else {
      logger.debug(`[${pkgName}] 로컬 복사: ${distPath} → ${targetPath}`);
      await fsCopy(distPath, targetPath);
    }
  } else {
    // 스토리지 업로드
    const distPath = path.resolve(pkgPath, "dist");
    const remotePath = publishConfig.path ?? "/";

    if (dryRun) {
      logger.info(`[DRY-RUN] [${pkgName}] ${publishConfig.type} 업로드: ${distPath} → ${remotePath}`);
    } else {
      logger.debug(`[${pkgName}] ${publishConfig.type} 업로드: ${distPath} → ${remotePath}`);
      await StorageFactory.connect(
        publishConfig.type,
        {
          host: publishConfig.host,
          port: publishConfig.port,
          user: publishConfig.user,
          pass: publishConfig.pass,
        },
        async (storage) => {
          await storage.uploadDir(distPath, remotePath);
        },
      );
    }
  }
}

//#endregion

//#region Dependency Levels

/**
 * 배포 패키지의 의존성 레벨을 계산한다.
 * 의존성이 없는 패키지 → Level 0, Level 0에만 의존 → Level 1, ...
 */
async function computePublishLevels(
  publishPkgs: Array<{ name: string; path: string; config: SdPublishConfig }>,
): Promise<Array<Array<{ name: string; path: string; config: SdPublishConfig }>>> {
  const pkgNames = new Set(publishPkgs.map((p) => p.name));

  // 각 패키지의 워크스페이스 내 의존성 수집
  const depsMap = new Map<string, Set<string>>();
  for (const pkg of publishPkgs) {
    const pkgJson = await fsReadJson<PackageJson>(path.resolve(pkg.path, "package.json"));
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
    depsMap.set(pkg.name, workspaceDeps);
  }

  // 위상 정렬로 레벨 분류
  const levels: Array<Array<{ name: string; path: string; config: SdPublishConfig }>> = [];
  const assigned = new Set<string>();
  const remaining = new Map(publishPkgs.map((p) => [p.name, p]));

  while (remaining.size > 0) {
    const level: Array<{ name: string; path: string; config: SdPublishConfig }> = [];
    for (const [name, pkg] of remaining) {
      const deps = depsMap.get(name)!;
      if ([...deps].every((d) => assigned.has(d))) {
        level.push(pkg);
      }
    }

    if (level.length === 0) {
      // 순환 의존성 — 남은 패키지를 모두 마지막 레벨에 배치
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

//#endregion

//#region Main

/**
 * publish 명령을 실행한다.
 *
 * **배포 순서 (안전성 우선):**
 * 1. 사전 검증 (npm 인증, Git 상태)
 * 2. 버전 업그레이드 (package.json + 템플릿)
 * 3. 빌드
 * 4. Git 커밋/태그/푸시 (변경된 파일만 명시적으로 staging)
 * 5. pnpm 배포
 * 6. postPublish (실패해도 계속)
 */
export async function runPublish(options: PublishOptions): Promise<void> {
  const { targets, noBuild, dryRun } = options;
  const cwd = process.cwd();
  const logger = consola.withTag("sd:cli:publish");

  if (dryRun) {
    logger.info("[DRY-RUN] 시뮬레이션 모드 - 실제 배포 없음");
  }

  logger.debug("배포 시작", { targets, noBuild, dryRun });

  // sd.config.ts 로드
  let sdConfig: SdConfig;
  try {
    sdConfig = await loadSdConfig({ cwd, dev: false, opt: options.options });
    logger.debug("sd.config.ts 로드 완료");
  } catch (err) {
    consola.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // package.json 로드
  const projPkgPath = path.resolve(cwd, "package.json");
  const projPkg = await fsReadJson<PackageJson>(projPkgPath);

  // pnpm-workspace.yaml에서 워크스페이스 패키지 경로 수집
  const workspaceYamlPath = path.resolve(cwd, "pnpm-workspace.yaml");
  const workspaceGlobs: string[] = [];
  if (await fsExists(workspaceYamlPath)) {
    const yamlContent = await fsRead(workspaceYamlPath);
    let inPackages = false;
    for (const line of yamlContent.split("\n")) {
      if (/^packages:\s*$/.test(line)) {
        inPackages = true;
        continue;
      }
      if (inPackages) {
        const match = /^\s+-\s+(.+)$/.exec(line);
        if (match != null) {
          workspaceGlobs.push(match[1].trim());
        } else {
          break;
        }
      }
    }
  }

  const allPkgPaths = (await Promise.all(workspaceGlobs.map((item) => fsGlob(path.resolve(cwd, item)))))
    .flat()
    .filter((item) => !item.includes("."));

  // publish 설정이 있는 패키지 필터링
  const publishPackages: Array<{
    name: string;
    path: string;
    config: SdPublishConfig;
  }> = [];

  for (const [name, config] of Object.entries(sdConfig.packages)) {
    if (config == null) continue;
    if (config.target === "scripts") continue;

    const pkgConfig = config;
    if (pkgConfig.publish == null) continue;

    // targets가 지정되면 해당 패키지만 포함
    if (targets.length > 0 && !targets.includes(name)) continue;

    const pkgPath = allPkgPaths.find((p) => path.basename(p) === name);
    if (pkgPath == null) {
      logger.warn(`패키지를 찾을 수 없습니다: ${name}`);
      continue;
    }

    publishPackages.push({
      name,
      path: pkgPath,
      config: pkgConfig.publish,
    });
  }

  if (publishPackages.length === 0) {
    process.stdout.write("✔ 배포할 패키지가 없습니다.\n");
    return;
  }

  logger.debug(
    "배포 대상 패키지",
    publishPackages.map((p) => p.name),
  );

  // Git 사용 여부 확인
  const hasGit = await fsExists(path.resolve(cwd, ".git"));

  //#region Phase 1: 사전 검증

  // npm 인증 확인 (npm publish 설정이 있는 경우)
  if (publishPackages.some((p) => p.config === "npm")) {
    logger.debug("npm 인증 확인...");
    try {
      const whoami = await spawn("npm", ["whoami"]);
      if (whoami.trim() === "") {
        throw new Error("npm 로그인 정보가 없습니다.");
      }
      logger.debug(`npm 로그인 확인: ${whoami.trim()}`);
    } catch {
      consola.error(
        "npm 토큰이 유효하지 않거나 만료되었습니다.\n" +
          "https://www.npmjs.com/settings/~/tokens 에서 Granular Access Token 생성 후:\n" +
          "  npm config set //registry.npmjs.org/:_authToken <토큰>",
      );
      process.exitCode = 1;
      return;
    }
  }

  // SSH 키 인증 확인 (pass 없는 SFTP publish 설정이 있는 경우)
  try {
    await ensureSshAuth(publishPackages, logger);
  } catch (err) {
    consola.error(`SSH 인증 설정 실패: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // Git 미커밋 변경사항 확인 (noBuild가 아닌 경우)
  if (!noBuild && hasGit) {
    logger.debug("Git 커밋 여부 확인...");
    try {
      // unstaged 변경사항 확인 (packages/ 폴더만)
      const diff = await spawn("git", ["diff", "--name-only", "--", "packages/"]);
      if (diff.trim() !== "") {
        throw new Error("커밋되지 않은 변경사항이 있습니다.\n" + diff);
      }

      // staged 변경사항 확인 (packages/ 폴더만)
      const stagedDiff = await spawn("git", ["diff", "--cached", "--name-only", "--", "packages/"]);
      if (stagedDiff.trim() !== "") {
        throw new Error("staged된 변경사항이 있습니다. 먼저 커밋하거나 unstage하세요.\n" + stagedDiff);
      }
    } catch (err) {
      consola.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
      return;
    }
  }

  //#endregion

  //#region Phase 2 & 3: 빌드 또는 noBuild 경고

  let version = projPkg.version;

  if (noBuild) {
    // noBuild 경고
    logger.warn("빌드하지 않고 배포하는 것은 상당히 위험합니다.");
    await waitWithCountdown("프로세스를 중지하려면 'CTRL+C'를 누르세요.", 5);
  } else {
    // 버전 업그레이드
    logger.debug("버전 업그레이드...");
    const upgradeResult = await upgradeVersion(cwd, allPkgPaths, dryRun);
    version = upgradeResult.version;
    const _changedFiles = upgradeResult.changedFiles;
    if (dryRun) {
      logger.info(`[DRY-RUN] 버전 업그레이드: ${projPkg.version} → ${version} (파일 수정 없음)`);
    } else {
      logger.info(`버전 업그레이드: ${projPkg.version} → ${version}`);
    }

    // 빌드 실행
    if (dryRun) {
      logger.info("[DRY-RUN] 빌드 시작 (검증용)...");
    } else {
      logger.debug("빌드 시작...");
    }

    try {
      await runBuild({
        targets: publishPackages.map((p) => p.name),
        options: options.options,
      });

      // 빌드 실패 확인
      if (process.exitCode === 1) {
        throw new Error("빌드 실패");
      }
    } catch {
      if (dryRun) {
        logger.error("[DRY-RUN] 빌드 실패");
      } else {
        consola.error(
          "빌드 실패. 수동 복구가 필요할 수 있습니다:\n" +
            "  버전 변경을 되돌리려면:\n" +
            "    git checkout -- package.json packages/*/package.json packages/sd-cli/templates/",
        );
      }
      process.exitCode = 1;
      return;
    }

    //#region Phase 3: Git 커밋/태그/푸시

    if (hasGit) {
      if (dryRun) {
        logger.info("[DRY-RUN] Git 커밋/태그/푸시 시뮬레이션...");
        logger.info(`[DRY-RUN] git add (${_changedFiles.length}개 파일)`);
        logger.info(`[DRY-RUN] git commit -m "v${version}"`);
        logger.info(`[DRY-RUN] git tag -a v${version} -m "v${version}"`);
        logger.info("[DRY-RUN] git push --dry-run");
        await spawn("git", ["push", "--dry-run"]);
        logger.info("[DRY-RUN] git push --tags --dry-run");
        await spawn("git", ["push", "--tags", "--dry-run"]);
        logger.info("[DRY-RUN] Git 작업 시뮬레이션 완료");
      } else {
        logger.debug("Git 커밋/태그/푸시...");
        try {
          await spawn("git", ["add", ..._changedFiles]);
          await spawn("git", ["commit", "-m", `v${version}`]);
          await spawn("git", ["tag", "-a", `v${version}`, "-m", `v${version}`]);
          await spawn("git", ["push"]);
          await spawn("git", ["push", "--tags"]);
          logger.debug("Git 작업 완료");
        } catch (err) {
          consola.error(
            `Git 작업 실패: ${err instanceof Error ? err.message : err}\n` +
              "수동 복구가 필요할 수 있습니다:\n" +
              `  git revert HEAD  # 버전 커밋 되돌리기\n` +
              `  git tag -d v${version}  # 태그 삭제`,
          );
          process.exitCode = 1;
          return;
        }
      }
    }

    //#endregion
  }

  //#endregion

  //#region Phase 4: 배포 (의존성 레벨별 병렬, Listr)

  const levels = await computePublishLevels(publishPackages);
  const publishedPackages: string[] = [];
  let publishFailed = false;

  const publishListr = new Listr(
    levels.map(
      (levelPkgs, levelIdx): ListrTask => ({
        title: `Level ${levelIdx + 1}/${levels.length}`,
        skip: () => publishFailed,
        task: (_, task) =>
          task.newListr(
            levelPkgs.map(
              (pkg): ListrTask => ({
                title: dryRun ? `[DRY-RUN] ${pkg.name}` : pkg.name,
                task: async (_ctx, pkgTask) => {
                  const maxRetries = 3;
                  for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                      await publishPackage(pkg.path, pkg.config, version, cwd, logger, dryRun);
                      break;
                    } catch (err) {
                      if (attempt < maxRetries) {
                        const delay = attempt * 5_000;
                        pkgTask.title = dryRun
                          ? `[DRY-RUN] ${pkg.name} (재시도 ${attempt + 1}/${maxRetries})`
                          : `${pkg.name} (재시도 ${attempt + 1}/${maxRetries})`;
                        await new Promise((resolve) => setTimeout(resolve, delay));
                      } else {
                        throw err;
                      }
                    }
                  }
                  publishedPackages.push(pkg.name);
                },
              }),
            ),
            { concurrent: true, exitOnError: false },
          ),
      }),
    ),
    {
      concurrent: false,
      exitOnError: false,
      renderer: consola.level >= LogLevels.debug ? "verbose" : "default",
    },
  );

  try {
    await publishListr.run();
  } catch {
    // Listr 내부 에러는 아래에서 처리
  }

  // 실패한 패키지 확인
  const allPkgNames = publishPackages.map((p) => p.name);
  const failedPkgNames = allPkgNames.filter((n) => !publishedPackages.includes(n));

  if (failedPkgNames.length > 0) {
    publishFailed = true;

    if (publishedPackages.length > 0) {
      consola.error(
        "배포 중 오류가 발생했습니다.\n" +
          "이미 배포된 패키지:\n" +
          publishedPackages.map((n) => `  - ${n}`).join("\n") +
          "\n\n수동 복구가 필요할 수 있습니다.\n" +
          "npm 패키지는 72시간 내에 `npm unpublish <pkg>@<version>` 으로 삭제할 수 있습니다.",
      );
    }

    for (const name of failedPkgNames) {
      consola.error(`[${name}] 배포 실패`);
    }
    process.exitCode = 1;
    return;
  }

  //#endregion

  //#region Phase 5: postPublish

  if (sdConfig.postPublish != null && sdConfig.postPublish.length > 0) {
    if (dryRun) {
      logger.info("[DRY-RUN] postPublish 스크립트 시뮬레이션...");
    } else {
      logger.debug("postPublish 스크립트 실행...");
    }

    for (const script of sdConfig.postPublish) {
      try {
        const cmd = replaceEnvVariables(script.cmd, version, cwd);
        const args = script.args.map((arg) => replaceEnvVariables(arg, version, cwd));

        if (dryRun) {
          logger.info(`[DRY-RUN] 실행 예정: ${cmd} ${args.join(" ")}`);
        } else {
          logger.debug(`실행: ${cmd} ${args.join(" ")}`);
          await spawn(cmd, args, { cwd });
        }
      } catch (err) {
        // postPublish 실패 시 경고만 출력 (배포 롤백 불가)
        logger.warn(`postPublish 스크립트 실패 (계속 진행): ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  //#endregion

  if (dryRun) {
    logger.info(`[DRY-RUN] 시뮬레이션 완료. 실제 배포 시 버전: v${version}`);
  } else {
    logger.info(`모든 배포가 완료되었습니다. (v${version})`);
  }
}

//#endregion
