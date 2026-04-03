import path from "path";
import semver from "semver";
import { consola } from "consola";
import { StorageFactory } from "@simplysm/storage";
import { cpx, fsx } from "@simplysm/core-node";
import { env, json } from "@simplysm/core-common";
import "@simplysm/core-common";
import type { SdConfig, SdPublishConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { validateTargets } from "../utils/package-utils";
import { runBuild } from "./build";
import { parseWorkspaceGlobs } from "../utils/replace-deps";
import os from "os";
import fs from "fs";
import ssh2 from "ssh2";
import { password as passwordPrompt } from "@inquirer/prompts";

const { Client: SshClient, utils } = ssh2;

//#region Types

/**
 * 배포 명령어 옵션
 */
export interface PublishOptions {
  /** 배포 대상 패키지 필터 (빈 배열이면 publish 설정이 있는 모든 패키지 배포) */
  targets: string[];
  /** 빌드 없이 배포 (위험) */
  noBuild: boolean;
  /** 실제 배포 없이 시뮬레이션 */
  dryRun: boolean;
  /** sd.config.ts에 전달할 추가 옵션 */
  options: string[];
}

/**
 * package.json 타입 (필수 필드만)
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
 * @throws 치환되지 않은 환경변수가 남아있으면 에러를 던진다
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

  // 치환되지 않은 환경변수가 남아있으면 에러 발생
  if (/%[^%]+%/.test(result)) {
    throw new Error(`환경변수 치환 실패: ${str} → ${result}`);
  }

  return result;
}

/**
 * 카운트다운과 함께 대기
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
 * SSH 키 인증을 사전 검증하고 설정한다
 *
 * 비밀번호 없는 SFTP 서버의 경우:
 * 1. SSH 키 파일이 없으면 생성
 * 2. 키 인증을 테스트하고, 실패하면 비밀번호로 공개키를 등록
 */
async function ensureSshAuth(
  publishPackages: Array<{ name: string; config: SdPublishConfig }>,
  logger: ReturnType<typeof consola.withTag>,
): Promise<void> {
  // 비밀번호 없는 SFTP 서버 수집 (user@host 기준 중복 제거)
  const sshTargets = new Map<string, { host: string; port?: number; user: string }>();
  for (const pkg of publishPackages) {
    if (pkg.config.type === "npm") continue;
    if (pkg.config.type !== "sftp") continue;
    if (pkg.config.password != null) continue;
    if (pkg.config.user == null) {
      throw new Error(`[${pkg.name}] SFTP 설정에 user가 누락되었습니다.`);
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
    logger.info("SSH 키를 찾을 수 없습니다. 생성 중...");

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

  // 개인키 파싱 시도 (암호화 또는 형식 오류 시 Error 반환)
  const parsed = utils.parseKey(privateKeyData);
  const isKeyEncrypted = parsed instanceof Error;
  const sshAgent = process.env["SSH_AUTH_SOCK"];

  // 각 서버에 대해 키 인증 검증
  for (const [label, target] of sshTargets) {
    const canAuth = await testSshKeyAuth(target, {
      privateKey: isKeyEncrypted ? undefined : privateKeyData,
      agent: sshAgent,
    });
    if (canAuth) {
      logger.debug(`SSH 키 인증 확인됨: ${label}`);
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
 * SSH 키 인증 테스트 (연결 후 즉시 종료)
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
 * 비밀번호로 서버에 연결하여 SSH 공개키를 등록한다
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
      const escapedKey = publicKey.replace(/'/g, "'\\''");
      const cmd = [
        "mkdir -p ~/.ssh",
        "chmod 700 ~/.ssh",
        `echo '${escapedKey}' >> ~/.ssh/authorized_keys`,
        "chmod 600 ~/.ssh/authorized_keys",
      ].join(" && ");

      conn.exec(cmd, (err, stream) => {
        if (err) {
          conn.end();
          reject(new Error(`SSH 명령 실행 실패: ${err.message}`));
          return;
        }

        let stderr = "";
        stream.on("data", () => {}); // stdout 소비 (소비하지 않으면 스트림이 닫히지 않음)
        stream.stderr.on("data", (data: Uint8Array) => {
          stderr += data.toString();
        });
        stream.on("exit", (code: number | null) => {
          conn.end();
          if (code !== 0) {
            reject(new Error(`SSH 공개키 등록 실패 (종료 코드: ${code}): ${stderr}`));
          } else {
            resolve();
          }
        });
      });
    });
    conn.on("error", (err) => {
      reject(new Error(`SSH 연결 실패 (${target.host}): ${err.message}`));
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
 * @param dryRun true이면 파일을 수정하지 않고 새 버전만 계산
 */
async function upgradeVersion(
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
    prereleaseInfo !== null
      ? semver.inc(currentVersion, "prerelease")!
      : semver.inc(currentVersion, "patch")!;

  if (dryRun) {
    // dry-run: 파일을 수정하지 않고 새 버전만 반환
    return { version: newVersion, changedFiles: [] };
  }

  projPkg.version = newVersion;
  await fsx.write(projPkgPath, json.stringify(projPkg, { space: 2 }) + "\n");
  changedFiles.push(projPkgPath);

  // 각 패키지의 package.json에 버전 설정
  for (const pkgPath of allPkgPaths) {
    const pkgJsonPath = path.resolve(pkgPath, "package.json");
    const pkgJson = await fsx.readJson<PackageJson>(pkgJsonPath);
    pkgJson.version = newVersion;
    await fsx.write(pkgJsonPath, json.stringify(pkgJson, { space: 2 }) + "\n");
    changedFiles.push(pkgJsonPath);
  }

  // 템플릿 파일의 @simplysm 패키지 버전 동기화
  const templateFiles = await fsx.glob(path.resolve(cwd, "packages/sd-cli/templates/**/*.hbs"));
  const versionRegex = /("@simplysm\/[^"]+"\s*:\s*)"~[^"]+"/g;

  for (const templatePath of templateFiles) {
    const content = await fsx.read(templatePath);
    const newContent = content.replace(versionRegex, `$1"~${newVersion}"`);

    if (content !== newContent) {
      await fsx.write(templatePath, newContent);
      changedFiles.push(templatePath);
    }
  }

  return { version: newVersion, changedFiles };
}

//#endregion

//#region Package Publishing

/**
 * 개별 패키지 배포
 * @param dryRun true이면 실제 배포 없이 시뮬레이션
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

  if (publishConfig.type === "npm") {
    // npm 배포
    const prereleaseInfo = semver.prerelease(version);
    const args = ["publish", "--access", "public", "--no-git-checks"];

    if (prereleaseInfo !== null && typeof prereleaseInfo[0] === "string") {
      args.push("--tag", prereleaseInfo[0]);
    }

    if (dryRun) {
      args.push("--dry-run");
      logger.info(`[DRY-RUN] [${pkgName}] pnpm ${args.join(" ")}`);
    } else {
      logger.debug(`[${pkgName}] pnpm ${args.join(" ")}`);
    }

    await cpx.spawn("pnpm", args, { cwd: pkgPath });
  } else if (publishConfig.type === "local-directory") {
    // 로컬 디렉토리에 복사
    const targetPath = replaceEnvVariables(publishConfig.path, version, projectPath);
    const distPath = path.resolve(pkgPath, "dist");

    if (dryRun) {
      logger.info(`[DRY-RUN] [${pkgName}] 로컬 복사: ${distPath} → ${targetPath}`);
    } else {
      logger.debug(`[${pkgName}] 로컬 복사: ${distPath} → ${targetPath}`);
      await fsx.copy(distPath, targetPath);
    }
  } else {
    // 스토리지에 업로드
    const distPath = path.resolve(pkgPath, "dist");
    const remotePath = publishConfig.path ?? "/";

    if (dryRun) {
      logger.info(
        `[DRY-RUN] [${pkgName}] ${publishConfig.type} 업로드: ${distPath} → ${remotePath}`,
      );
    } else {
      logger.debug(`[${pkgName}] ${publishConfig.type} 업로드: ${distPath} → ${remotePath}`);
      await StorageFactory.connect(
        publishConfig.type,
        {
          host: publishConfig.host,
          port: publishConfig.port,
          user: publishConfig.user,
          password: publishConfig.password,
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
 * 배포할 패키지의 의존성 레벨을 계산한다.
 * 의존성이 없는 패키지 → Level 0, Level 0에만 의존하는 패키지 → Level 1, ...
 */
async function computePublishLevels(
  publishPkgs: Array<{ name: string; path: string; config: SdPublishConfig }>,
): Promise<Array<Array<{ name: string; path: string; config: SdPublishConfig }>>> {
  const pkgNames = new Set(publishPkgs.map((p) => p.name));

  // 각 패키지의 워크스페이스 의존성 수집
  const depsMap = new Map<string, Set<string>>();
  for (const pkg of publishPkgs) {
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

//#endregion

//#region Main

/**
 * 배포 명령어를 실행한다.
 *
 * **배포 순서 (안전 우선):**
 * 1. 사전 검증 (npm 인증, Git 상태)
 * 2. 버전 업그레이드 (package.json + 템플릿)
 * 3. 빌드
 * 4. Git commit/tag/push (변경된 파일만 명시적으로 스테이징)
 * 5. 패키지 배포 (npm/로컬 디렉토리/스토리지)
 * 6. postPublish (실패해도 계속 진행)
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
    logger.error(`sd.config.ts 로드 실패: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // 대상 유효성 검사
  validateTargets(targets, sdConfig.packages);

  // package.json 로드
  const projPkgPath = path.resolve(cwd, "package.json");
  const projPkg = await fsx.readJson<PackageJson>(projPkgPath);

  // pnpm-workspace.yaml에서 워크스페이스 패키지 경로 수집
  const workspaceYamlPath = path.resolve(cwd, "pnpm-workspace.yaml");
  const workspaceGlobs: string[] = [];
  if (await fsx.exists(workspaceYamlPath)) {
    const yamlContent = await fsx.read(workspaceYamlPath);
    workspaceGlobs.push(...parseWorkspaceGlobs(yamlContent));
  }

  const allPkgPaths = (
    await Promise.all(workspaceGlobs.map((item) => fsx.glob(path.resolve(cwd, item))))
  )
    .flat()
    .filter((item) => fs.existsSync(path.join(item, "package.json")));

  // publish 설정이 있는 패키지 필터링
  const publishPackages: Array<{
    name: string;
    path: string;
    config: SdPublishConfig;
  }> = [];

  for (const [name, config] of Object.entries(sdConfig.packages)) {
    if (config == null) continue;
    const pkgConfig = config;
    if (pkgConfig.publish == null) continue;

    // targets가 지정되면 해당 패키지만 포함
    if (targets.length > 0 && !targets.includes(name)) continue;

    const pkgPath = allPkgPaths.find((p) => path.basename(p) === name);
    if (pkgPath == null) {
      logger.warn(`패키지를 찾을 수 없음: ${name}`);
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

  // Git 사용 가능 여부 확인
  const hasGit = await fsx.exists(path.resolve(cwd, ".git"));

  //#region Phase 1: Pre-validation

  // npm 인증 검증 (npm publish 설정이 있는 경우)
  if (publishPackages.some((p) => p.config.type === "npm")) {
    logger.debug("npm 인증 검증 중...");
    try {
      const { stdout: whoami } = await cpx.spawn("npm", ["whoami"]);
      if (whoami.trim() === "") {
        throw new Error("npm 로그인 정보를 찾을 수 없습니다.");
      }
      logger.debug(`npm 로그인 확인됨: ${whoami.trim()}`);
    } catch {
      logger.error(
        "npm 인증 실패. 로그인 상태를 확인해주세요.\n" +
          "  npm whoami              # 현재 로그인 확인\n" +
          "  npm login               # 로그인\n" +
          "  npm config set //registry.npmjs.org/:_authToken <token>  # 토큰 직접 설정",
      );
      process.exitCode = 1;
      return;
    }
  }

  // SSH 키 인증 검증 (비밀번호 없는 SFTP publish 설정이 있는 경우)
  try {
    await ensureSshAuth(publishPackages, logger);
  } catch (err) {
    logger.error(`SSH 인증 설정 실패: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
    return;
  }

  // 커밋되지 않은 변경사항 확인 및 자동 커밋 시도 (noBuild가 아닌 경우)
  if (!noBuild && hasGit) {
    logger.debug("git 커밋 상태 확인 중...");
    try {
      const { stdout: diff } = await cpx.spawn("git", ["diff", "--name-only"]);
      const { stdout: stagedDiff } = await cpx.spawn("git", ["diff", "--cached", "--name-only"]);

      if (diff.trim() !== "" || stagedDiff.trim() !== "") {
        logger.info("커밋되지 않은 변경사항 감지. claude로 자동 커밋 시도 중...");
        try {
          await cpx.spawn(
            "claude",
            ["-p", "/sd-commit", "--dangerously-skip-permissions", "--model", "haiku"],
            {
              stdio: "inherit",
              env: {
                ...process.env,
                MCP_CONNECTION_NONBLOCKING: "true",
              },
            },
          );
        } catch (e) {
          throw new Error(
            "자동 커밋에 실패했습니다. 수동으로 커밋 후 다시 시도해주세요.\n" +
              (e instanceof Error ? e.message : String(e)),
          );
        }
      }
    } catch (err) {
      logger.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
      return;
    }
  }

  //#endregion

  //#region Phase 2 & 3: Build or noBuild warning

  let version = projPkg.version;

  if (noBuild) {
    // noBuild 경고
    logger.warn("빌드 없이 배포하는 것은 매우 위험합니다.");
    await waitWithCountdown("중단하려면 'CTRL+C'를 누르세요.", 5);
  } else {
    // 버전 업그레이드
    logger.debug("버전 업그레이드 중...");
    const upgradeResult = await upgradeVersion(cwd, allPkgPaths, dryRun);
    version = upgradeResult.version;
    const _changedFiles = upgradeResult.changedFiles;
    if (dryRun) {
      logger.info(`[DRY-RUN] 버전 업그레이드: ${projPkg.version} → ${version} (파일 미수정)`);
    } else {
      logger.info(`버전 업그레이드: ${projPkg.version} → ${version}`);
    }

    // 빌드 실행
    if (dryRun) {
      logger.info("[DRY-RUN] 빌드 시작 (검증만)...");
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
        logger.error(
          "빌드 실패. 수동 복구가 필요할 수 있습니다:\n" +
            "  버전 변경을 되돌리려면:\n" +
            "    git checkout -- package.json packages/*/package.json packages/sd-cli/templates/",
        );
      }
      process.exitCode = 1;
      return;
    }

    //#region Phase 3: Git commit/tag/push

    if (hasGit) {
      if (dryRun) {
        logger.info("[DRY-RUN] Git commit/tag/push 시뮬레이션 중...");
        logger.info(`[DRY-RUN] git add (${_changedFiles.length}개 파일)`);
        logger.info(`[DRY-RUN] git commit -m "v${version}"`);
        logger.info(`[DRY-RUN] git tag -a v${version} -m "v${version}"`);
        logger.info("[DRY-RUN] 리모트에 push 예정 (건너뜀)");
        logger.info("[DRY-RUN] 태그를 리모트에 push 예정 (건너뜀)");
        logger.info("[DRY-RUN] Git 작업 시뮬레이션 완료");
      } else {
        logger.debug("Git commit/tag/push...");
        try {
          await cpx.spawn("git", ["add", ..._changedFiles]);
          await cpx.spawn("git", ["commit", "-m", `v${version}`]);
          await cpx.spawn("git", ["tag", "-a", `v${version}`, "-m", `v${version}`]);
          await cpx.spawn("git", ["push"]);
          await cpx.spawn("git", ["push", "--tags"]);
          logger.debug("Git 작업 완료");
        } catch (err) {
          logger.error(
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

  //#region Phase 4: Deployment (sequential by dependency level, parallel within level)

  const levels = await computePublishLevels(publishPackages);
  const publishedPackages: string[] = [];
  let publishFailed = false;

  // 레벨별 순차 실행
  for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
    if (publishFailed) break;

    const levelPkgs = levels[levelIdx];
    logger.start(`Level ${levelIdx + 1}/${levels.length}`);

    // 레벨 내 병렬 실행 (Promise.allSettled)
    const publishPromises = levelPkgs.map(async (pkg) => {
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await publishPackage(pkg.path, pkg.config, version, cwd, logger, dryRun);
          logger.debug(dryRun ? `[DRY-RUN] ${pkg.name}` : pkg.name);
          publishedPackages.push(pkg.name);
          return { status: "success" as const, name: pkg.name };
        } catch (err) {
          if (attempt < maxRetries) {
            const delay = attempt * 5_000;
            logger.debug(
              dryRun
                ? `[DRY-RUN] ${pkg.name} (retry ${attempt + 1}/${maxRetries})`
                : `${pkg.name} (retry ${attempt + 1}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            throw err;
          }
        }
      }
      // TypeScript 타입 체커를 위한 폴백 (실제로 도달 불가)
      return { status: "error" as const, name: pkg.name, error: new Error("알 수 없는 에러") };
    });

    const results = await Promise.allSettled(publishPromises);

    // 레벨 내 실패 확인
    const rejectedResults = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    if (rejectedResults.length > 0) {
      publishFailed = true;
      for (const r of rejectedResults) {
        logger.error(r.reason instanceof Error ? r.reason.message : r.reason);
      }
      logger.fail(`Level ${levelIdx + 1}/${levels.length}`);
    } else {
      logger.success(`Level ${levelIdx + 1}/${levels.length}`);
    }
  }

  // 실패한 패키지 확인
  const allPkgNames = publishPackages.map((p) => p.name);
  const failedPkgNames = allPkgNames.filter((n) => !publishedPackages.includes(n));

  if (failedPkgNames.length > 0) {
    if (publishedPackages.length > 0) {
      logger.error(
        "배포 중 에러 발생.\n" +
          "이미 배포된 패키지:\n" +
          publishedPackages.map((n) => `  - ${n}`).join("\n") +
          "\n\n수동 복구가 필요할 수 있습니다.\n" +
          "npm 패키지는 72시간 이내에 `npm unpublish <pkg>@<version>`으로 삭제할 수 있습니다.",
      );
    }

    for (const name of failedPkgNames) {
      logger.error(`[${name}] 배포 실패`);
    }
    process.exitCode = 1;
    return;
  }

  //#endregion

  //#region Phase 5: postPublish

  if (sdConfig.postPublish != null && sdConfig.postPublish.length > 0) {
    if (dryRun) {
      logger.info("[DRY-RUN] postPublish 스크립트 시뮬레이션 중...");
    } else {
      logger.debug("postPublish 스크립트 실행 중...");
    }

    for (const script of sdConfig.postPublish) {
      try {
        const cmd = replaceEnvVariables(script.cmd, version, cwd);
        const args = script.args.map((arg) => replaceEnvVariables(arg, version, cwd));

        if (dryRun) {
          logger.info(`[DRY-RUN] 실행 예정: ${cmd} ${args.join(" ")}`);
        } else {
          logger.debug(`실행 중: ${cmd} ${args.join(" ")}`);
          await cpx.spawn(cmd, args, { cwd });
        }
      } catch (err) {
        // postPublish 실패 시 경고만 출력 (배포 롤백 불가)
        logger.warn(
          `postPublish 스크립트 실패 (계속 진행): ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  //#endregion

  if (dryRun) {
    logger.info(`[DRY-RUN] 시뮬레이션 완료. 실제 배포 버전: v${version}`);
  } else {
    logger.info(`모든 배포 완료. (v${version})`);
  }
}

//#endregion
