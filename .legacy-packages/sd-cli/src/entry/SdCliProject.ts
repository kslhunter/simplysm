import path from "path";
import { FsUtils, PathUtils, SdLogger, SdProcess } from "@simplysm/sd-core-node";
import semver from "semver";
import { NeverEntryError, StringUtils, Wait } from "@simplysm/sd-core-common";
import { SdStorage } from "@simplysm/sd-storage";
import { SdCliLocalUpdate } from "./SdCliLocalUpdate";
import { SdCliConvertMessageUtils } from "../utils/SdCliConvertMessageUtils";
import type { TSdPackageConfig } from "../types/config/ISdProjectConfig";
import type { ISdBuildMessage } from "../types/build/ISdBuildMessage";
import { loadProjConfAsync } from "../utils/loadProjConfAsync";
import { SdProjectBuildRunner } from "../pkg-builders/SdProjectBuildRunner";
import type { INpmConfig } from "../types/common-config/INpmConfig";

export class SdCliProject {
  static async watchAsync(opt: {
    config: string;
    options?: string[];
    packages?: string[];
    emitOnly?: boolean;
    noEmit?: boolean;
  }): Promise<void> {
    const logger = SdLogger.get(["simplysm", "sd-cli", "SdCliProject", "watchAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = await loadProjConfAsync(process.cwd(), true, opt);

    if (!opt.noEmit) {
      if (projConf.localUpdates) {
        logger.debug("로컬 라이브러리 업데이트 변경감지 시작...");
        await SdCliLocalUpdate.watchAsync(opt);
      }
    }

    logger.debug("프로젝트 package.json 가져오기...");
    const projNpmConf = (await FsUtils.readJsonAsync(
      path.resolve(process.cwd(), "package.json"),
    )) as INpmConfig;

    logger.debug("패키지 목록 구성...");
    if (!projNpmConf.workspaces) {
      throw new Error("프로젝트 package.json에 workspaces가 설정되어있지 않습니다.");
    }
    const allPkgPaths = (
      await projNpmConf.workspaces.mapManyAsync(async (item) => await FsUtils.globAsync(item))
    )
      .filter((item) => !item.includes("."))
      .map((item) => PathUtils.norm(item));
    let pkgPaths = allPkgPaths.filter((pkgPath) => path.basename(pkgPath) in projConf.packages);
    if (opt.packages) {
      pkgPaths = pkgPaths.filter((pkgPath) => opt.packages!.includes(path.basename(pkgPath)));
    }

    logger.debug("패키지 존재 확인...");
    const notExistsPkgs = Object.keys(projConf.packages).filter((pkgConfKey) =>
      allPkgPaths.every((pkgPath) => path.basename(pkgPath) !== pkgConfKey),
    );
    if (notExistsPkgs.length > 0) {
      throw new Error("패키지를 찾을 수 없습니다. (" + notExistsPkgs.join(", ") + ")");
    }

    await SdProjectBuildRunner.watchAsync({
      allPkgPaths,
      pkgPaths,
      projConf,
      emitOnly: opt.emitOnly ?? false,
      noEmit: opt.noEmit ?? false,
      onChange: () => {
        logger.debug("빌드를 시작합니다...");
      },
      onComplete: (messages) => {
        this._logging(messages, logger);
      },
    });
  }

  static async buildAsync(opt: {
    config: string;
    options?: string[];
    packages?: string[];
  }): Promise<void> {
    const logger = SdLogger.get(["simplysm", "sd-cli", "SdCliProject", "watchAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = await loadProjConfAsync(process.cwd(), false, opt);

    logger.debug("프로젝트 package.json 가져오기...");
    const projNpmConf = (await FsUtils.readJsonAsync(
      path.resolve(process.cwd(), "package.json"),
    )) as INpmConfig;

    logger.debug("패키지 목록 구성...");
    if (!projNpmConf.workspaces) {
      throw new Error("프로젝트 package.json에 workspaces가 설정되어있지 않습니다.");
    }
    const allPkgPaths = (
      await projNpmConf.workspaces.mapManyAsync(async (item) => await FsUtils.globAsync(item))
    )
      .filter((item) => !item.includes("."))
      .map((item) => PathUtils.norm(item));
    let pkgPaths = allPkgPaths.filter((pkgPath) => path.basename(pkgPath) in projConf.packages);
    if (opt.packages) {
      pkgPaths = pkgPaths.filter((pkgPath) => opt.packages!.includes(path.basename(pkgPath)));
    }

    logger.debug("패키지 존재 확인...");
    const notExistsPkgs = Object.keys(projConf.packages).filter((pkgConfKey) =>
      allPkgPaths.every((pkgPath) => path.basename(pkgPath) !== pkgConfKey),
    );
    if (notExistsPkgs.length > 0) {
      throw new Error("패키지를 찾을 수 없습니다. (" + notExistsPkgs.join(", ") + ")");
    }

    logger.debug("프로젝트 및 패키지 버전 설정...");
    this._upgradeVersion(projNpmConf, allPkgPaths);

    logger.debug("빌드 프로세스 시작...");
    const messages = await SdProjectBuildRunner.buildAsync({
      allPkgPaths,
      pkgPaths,
      projConf,
    });
    this._logging(messages, logger);
  }

  static async publishAsync(opt: {
    config: string;
    options?: string[];
    packages?: string[];
    noBuild?: boolean;
  }): Promise<void> {
    const logger = SdLogger.get(["simplysm", "sd-cli", "SdCliProject", "publishAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = await loadProjConfAsync(process.cwd(), false, opt);

    if (Object.values(projConf.packages).some((item) => item?.publish === "npm")) {
      logger.debug("npm/yarn 토큰 유효성 체크...");
      try {
        const npmWhoami = await SdProcess.spawnAsync("npm", ["whoami"]);
        if (StringUtils.isNullOrEmpty(npmWhoami.trim())) {
          throw new Error();
        }
        logger.debug(`npm 로그인 확인: ${npmWhoami.trim()}`);

        const yarnWhoami = await SdProcess.spawnAsync("yarn", ["npm", "whoami"]);
        if (StringUtils.isNullOrEmpty(yarnWhoami.trim())) {
          throw new Error();
        }
        logger.debug(`yarn 로그인 확인: ${yarnWhoami.trim()}`);
      } catch {
        throw new Error(
          "npm 토큰이 유효하지 않거나 만료되었습니다.\n" +
            "https://www.npmjs.com/settings/~/tokens 에서 Granular Access Token 생성 후:\n" +
            "  npm config set //registry.npmjs.org/:_authToken <토큰>\n" +
            "  yarn config set npmAuthToken <토큰> --home",
        );
      }
    }

    logger.debug("프로젝트 package.json 가져오기...");
    const projNpmConf = FsUtils.readJson(path.resolve(process.cwd(), "package.json")) as INpmConfig;

    if (opt.noBuild) {
      logger.warn("빌드하지 않고, 배포하는것은 상당히 위험합니다.");
      await this._waitSecMessageAsync("프로세스를 중지하려면, 'CTRL+C'를 누르세요.", 5);
    } else {
      // GIT 사용중일 경우, 커밋되지 않은 수정사항이 있는지 확인
      if (FsUtils.exists(path.resolve(process.cwd(), ".git"))) {
        logger.debug("GIT 커밋여부 확인...");
        const diff = await SdProcess.spawnAsync("git", [
          "diff",
          "--name-only",
          "--",
          ".",
          `:(exclude).*`,
          `:(exclude)_*`,
          `:(exclude)yarn.lock`,
          `:(exclude)packages/*/styles.css`,
          `:(exclude)packages/*/package.json`,
          `:(exclude)package.json`,
        ]);
        if (!StringUtils.isNullOrEmpty(diff.trim())) {
          throw new Error("커밋되지 않은 정보가 있습니다.\n" + diff);
        }
      }
    }

    logger.debug("패키지 목록 구성...");
    if (!projNpmConf.workspaces) {
      throw new Error("프로젝트 package.json에 workspaces가 설정되어있지 않습니다.");
    }
    const allPkgPaths = projNpmConf.workspaces
      .mapMany((item) => FsUtils.glob(item))
      .filter((item) => !item.includes("."))
      .map((item) => PathUtils.norm(item));
    let pkgPaths = allPkgPaths.filter((pkgPath) => path.basename(pkgPath) in projConf.packages);
    if (opt.packages) {
      pkgPaths = pkgPaths.filter((pkgPath) => opt.packages!.includes(path.basename(pkgPath)));
    }

    logger.debug("패키지 존재 확인...");
    const notExistsPkgs = Object.keys(projConf.packages).filter((pkgConfKey) =>
      allPkgPaths.every((pkgPath) => path.basename(pkgPath) !== pkgConfKey),
    );
    if (notExistsPkgs.length > 0) {
      throw new Error("패키지를 찾을 수 없습니다. (" + notExistsPkgs.join(", ") + ")");
    }

    if (!opt.noBuild) {
      logger.debug("프로젝트 및 패키지 버전 설정...");
      this._upgradeVersion(projNpmConf, allPkgPaths);

      // 빌드
      try {
        logger.debug("빌드 프로세스 시작...");
        const messages = await SdProjectBuildRunner.buildAsync({
          allPkgPaths,
          pkgPaths,
          projConf,
        });

        this._logging(messages, logger);
      } catch (err) {
        await SdProcess.spawnAsync("git", ["checkout", "."]);
        throw err;
      }

      // GIT 사용중일경우, 새 버전 커밋 및 TAG 생성
      if (FsUtils.exists(path.resolve(process.cwd(), ".git"))) {
        logger.debug("새 버전 커밋 및 TAG 생성...");
        await SdProcess.spawnAsync("git", ["add", "."]);
        await SdProcess.spawnAsync("git", ["commit", "-m", `v${projNpmConf.version}`]);
        await SdProcess.spawnAsync("git", [
          "tag",
          "-a",
          `v${projNpmConf.version}`,
          "-m",
          `v${projNpmConf.version}`,
        ]);

        logger.debug("새 버전 푸쉬...");
        await SdProcess.spawnAsync("git", ["push"]);
        await SdProcess.spawnAsync("git", ["push", "--tags"]);
      }
    }

    logger.debug("배포 시작...");
    await pkgPaths.parallelAsync(async (pkgPath) => {
      const pkgName = path.basename(pkgPath);
      const pkgConf = projConf.packages[pkgName];
      if (pkgConf?.publish == null) return;

      logger.debug(`[${pkgName}] 배포 시작...`);
      await this._publishPkgAsync(pkgPath, pkgConf.publish);
      logger.debug(`[${pkgName}] 배포 완료`);
    });

    if (projConf.postPublish && projConf.postPublish.length > 0) {
      logger.debug("배포후 작업...");
      for (const postPublishItem of projConf.postPublish) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (postPublishItem.type === "script") {
          const replaceEnvPath = (str: string) =>
            str.replace(/%([^%]*)%/g, (item) => {
              const envName = item.replace(/%/g, "");
              if (!StringUtils.isNullOrEmpty(projNpmConf.version) && envName === "SD_VERSION") {
                return projNpmConf.version;
              }
              if (envName === "SD_PROJECT_PATH") {
                return process.cwd();
              }
              return process.env[envName] ?? item;
            });

          const cmd = replaceEnvPath(postPublishItem.cmd);
          const args = postPublishItem.args.map((arg) => replaceEnvPath(arg));
          await SdProcess.spawnAsync(cmd, args);
        } else {
          throw new NeverEntryError();
        }
      }
    }

    logger.info(`모든 배포가 완료되었습니다. (v${projNpmConf.version})`);
  }

  private static async _publishPkgAsync(
    pkgPath: string,
    pkgPubConf: TSdPackageConfig["publish"],
  ): Promise<void> {
    if (pkgPubConf === "npm") {
      const pkgNpmConf = FsUtils.readJson(path.resolve(pkgPath, "package.json")) as INpmConfig;
      const prereleaseInfo = semver.prerelease(pkgNpmConf.version);

      const args = ["npm", "publish", "--access", "public"];
      if (prereleaseInfo !== null && typeof prereleaseInfo[0] === "string") {
        args.push("--tag", prereleaseInfo[0]);
      }

      await SdProcess.spawnAsync("yarn", args, { cwd: pkgPath });
    } else if (pkgPubConf?.type === "local-directory") {
      const pkgNpmConf = FsUtils.readJson(path.resolve(pkgPath, "package.json")) as INpmConfig;

      const targetRootPath = pkgPubConf.path.replace(/%([^%]*)%/g, (item) => {
        const envName = item.replace(/%/g, "");
        if (!StringUtils.isNullOrEmpty(pkgNpmConf.version) && envName === "SD_VERSION") {
          return pkgNpmConf.version;
        }
        if (envName === "SD_PROJECT_PATH") {
          return process.cwd();
        }
        return process.env[envName] ?? item;
      });

      const filePaths = FsUtils.glob(path.resolve(pkgPath, "dist", "**", "*"), {
        dot: true,
        nodir: true,
      });

      await filePaths.parallelAsync(async (filePath) => {
        const relativeFilePath = path.relative(path.resolve(pkgPath, "dist"), filePath);
        const targetPath = PathUtils.posix(targetRootPath, relativeFilePath);
        await FsUtils.copyAsync(filePath, targetPath);
      });
    } else if (
      pkgPubConf?.type === "ftp" ||
      pkgPubConf?.type === "ftps" ||
      pkgPubConf?.type === "sftp"
    ) {
      await SdStorage.connectAsync(
        pkgPubConf.type,
        {
          host: pkgPubConf.host,
          port: pkgPubConf.port,
          user: pkgPubConf.user,
          pass: pkgPubConf.pass,
        },
        async (storage) => {
          await storage.uploadDirAsync(path.resolve(pkgPath, "dist"), pkgPubConf.path ?? "/");
        },
      );
    } else {
      throw new NeverEntryError();
    }
  }

  private static async _waitSecMessageAsync(msg: string, sec: number): Promise<void> {
    for (let i = sec; i > 0; i--) {
      if (i !== sec) {
        process.stdout.cursorTo(0);
      }
      process.stdout.write(`${msg} ${i}`);
      await Wait.time(1000);
    }

    process.stdout.cursorTo(0);
    process.stdout.clearLine(0);
  }

  private static _upgradeVersion(projNpmConf: INpmConfig, allPkgPaths: string[]) {
    // 작업공간 package.json 버전 설정
    const currentVersion = projNpmConf.version;
    const prereleaseInfo = semver.prerelease(currentVersion);

    // prerelease 여부에 따라 증가 방식 결정
    const newVersion =
      prereleaseInfo !== null
        ? semver.inc(currentVersion, "prerelease")!
        : semver.inc(currentVersion, "patch")!;

    projNpmConf.version = newVersion;

    const pkgNames = allPkgPaths.map((pkgPath) => {
      const pkgNpmConf = FsUtils.readJson(path.resolve(pkgPath, "package.json"));
      return pkgNpmConf.name;
    });

    const updateDepVersion = (deps: Record<string, string> | undefined): void => {
      if (!deps) return;
      for (const depName of Object.keys(deps)) {
        if (pkgNames.includes(depName)) {
          deps[depName] = newVersion;
        }
      }
    };
    updateDepVersion(projNpmConf.dependencies);
    updateDepVersion(projNpmConf.optionalDependencies);
    updateDepVersion(projNpmConf.devDependencies);
    updateDepVersion(projNpmConf.peerDependencies);

    const projNpmConfFilePath = path.resolve(process.cwd(), "package.json");
    FsUtils.writeJson(projNpmConfFilePath, projNpmConf, { space: 2 });

    // 각 패키지 package.json 버전 설정
    for (const pkgPath of allPkgPaths) {
      const pkgNpmConfFilePath = path.resolve(pkgPath, "package.json");
      const pkgNpmConf = FsUtils.readJson(pkgNpmConfFilePath);
      pkgNpmConf.version = newVersion;

      updateDepVersion(pkgNpmConf.dependencies);
      updateDepVersion(pkgNpmConf.optionalDependencies);
      updateDepVersion(pkgNpmConf.devDependencies);
      updateDepVersion(pkgNpmConf.peerDependencies);

      FsUtils.writeJson(pkgNpmConfFilePath, pkgNpmConf, { space: 2 });

      if (FsUtils.exists(path.resolve(pkgPath, "plugin.xml"))) {
        const cordovaPluginConfFilePath = path.resolve(pkgPath, "plugin.xml");
        const cordovaPluginConfContent = FsUtils.readFile(cordovaPluginConfFilePath);
        const newCordovaPluginConfContent = cordovaPluginConfContent.replace(
          /(<plugin\s[^>]*\bversion\s*=\s*")[^"]+(")/,
          `$1${newVersion}$2`,
        );

        FsUtils.writeFile(cordovaPluginConfFilePath, newCordovaPluginConfContent);
      }
    }
  }

  private static _logging(buildResults: ISdBuildMessage[], logger: SdLogger): void {
    const messageMap = buildResults.toSetMap(
      (item) => item.severity,
      (item) => SdCliConvertMessageUtils.getBuildMessageString(item),
    );

    if (messageMap.has("message")) {
      logger.log(`알림\n${Array.from(messageMap.get("message")!).join("\n")}`);
    }
    if (messageMap.has("suggestion")) {
      logger.info(`제안\n${Array.from(messageMap.get("suggestion")!).join("\n")}`);
    }
    if (messageMap.has("warning")) {
      logger.warn(`경고\n${Array.from(messageMap.get("warning")!).join("\n")}`);
    }
    if (messageMap.has("error")) {
      logger.error(`오류\n${Array.from(messageMap.get("error")!).join("\n")}`);
    }

    logger.info("모든 빌드가 완료되었습니다.");
  }
}
