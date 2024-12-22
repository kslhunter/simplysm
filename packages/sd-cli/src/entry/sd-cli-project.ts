import path from "path";
import { FsUtils, SdLogger, PathUtils, SdProcess } from "@simplysm/sd-core-node";
import { pathToFileURL } from "url";
import semver from "semver";
import { NeverEntryError, StringUtils, Wait } from "@simplysm/sd-core-common";
import { SdStorage } from "@simplysm/sd-storage";
import { SdCliLocalUpdate } from "./sd-cli-local-update";
import xml2js from "xml2js";
import { SdMultiBuildRunner } from "../pkg-builders/sd-multi.build-runner";
import { SdCliConvertMessageUtils } from "../utils/sd-cli-convert-message.utils";
import { type ISdProjectConfig, type TSdPackageConfig } from "../types/config.types";
import { type INpmConfig } from "../types/common-configs.types";
import { type ISdBuildMessage } from "../types/build.types";

export class SdCliProject {
  static async watchAsync(opt: {
    confFileRelPath: string;
    optNames: string[];
    pkgNames: string[];
    inspectNames: string[];
  }): Promise<void> {
    const logger = SdLogger.get(["simplysm", "sd-cli", "SdCliProject", "watchAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = (await import(pathToFileURL(path.resolve(process.cwd(), opt.confFileRelPath)).href)).default(
      true,
      opt.optNames,
    ) as ISdProjectConfig;

    if (projConf.localUpdates) {
      logger.debug("로컬 라이브러리 업데이트 변경감지 시작...");
      await SdCliLocalUpdate.watchAsync({
        confFileRelPath: opt.confFileRelPath,
        optNames: opt.optNames,
      });
    }

    logger.debug("프로젝트 package.json 가져오기...");
    const projNpmConf = FsUtils.readJson(path.resolve(process.cwd(), "package.json")) as INpmConfig;

    logger.debug("패키지 목록 구성...");
    if (!projNpmConf.workspaces) {
      throw new Error("프로젝트 package.json에 workspaces가 설정되어있지 않습니다.");
    }
    const allPkgPaths = projNpmConf.workspaces
      .mapMany((item) => FsUtils.glob(item))
      .filter((item) => !item.includes("."))
      .map((item) => PathUtils.norm(item));
    let pkgPaths = allPkgPaths.filter((pkgPath) => path.basename(pkgPath) in projConf.packages);
    if (opt.pkgNames.length !== 0) {
      pkgPaths = pkgPaths.filter((pkgPath) => opt.pkgNames.includes(path.basename(pkgPath)));
    }

    logger.debug("패키지 존재 확인...");
    const notExistsPkgs = Object.keys(projConf.packages).filter((pkgConfKey) =>
      allPkgPaths.every((pkgPath) => path.basename(pkgPath) !== pkgConfKey),
    );
    if (notExistsPkgs.length > 0) {
      throw new Error("패키지를 찾을 수 없습니다. (" + notExistsPkgs.join(", ") + ")");
    }

    logger.debug("빌드 프로세스 시작...");
    const multiBuildRunner = new SdMultiBuildRunner()
      .on("change", () => {
        logger.debug("빌드를 시작합니다...");
      })
      .on("complete", (messages) => {
        this.#logging(messages, logger);
      });

    await pkgPaths.parallelAsync(async (pkgPath) => {
      await multiBuildRunner.runAsync({
        cmd: "watch",
        pkgPath,
        projConf: projConf,
      });
    });
  }

  static async buildAsync(opt: { confFileRelPath: string; optNames: string[]; pkgNames: string[] }): Promise<void> {
    const logger = SdLogger.get(["simplysm", "sd-cli", "SdCliProject", "buildAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = (await import(pathToFileURL(path.resolve(process.cwd(), opt.confFileRelPath)).href)).default(
      false,
      opt.optNames,
    ) as ISdProjectConfig;

    logger.debug("프로젝트 package.json 가져오기...");
    const projNpmConf = FsUtils.readJson(path.resolve(process.cwd(), "package.json")) as INpmConfig;

    logger.debug("패키지 목록 구성...");
    if (!projNpmConf.workspaces) {
      throw new Error("프로젝트 package.json에 workspaces가 설정되어있지 않습니다.");
    }
    const allPkgPaths = projNpmConf.workspaces.mapMany((item) => FsUtils.glob(item)).map((item) => PathUtils.norm(item));
    let pkgPaths = allPkgPaths.filter((pkgPath) => path.basename(pkgPath) in projConf.packages);
    if (opt.pkgNames.length !== 0) {
      pkgPaths = pkgPaths.filter((pkgPath) => opt.pkgNames.includes(path.basename(pkgPath)));
    }

    logger.debug("프로젝트 및 패키지 버전 설정...");
    await this._upgradeVersionAsync(projNpmConf, allPkgPaths);

    logger.debug("빌드 프로세스 시작...");
    const multiBuildRunner = new SdMultiBuildRunner();

    const messages = await pkgPaths.parallelAsync(async (pkgPath) => {
      return await multiBuildRunner.runAsync({
        cmd: "build",
        pkgPath,
        projConf: projConf,
      });
    });
    this.#logging(messages.mapMany(), logger);
  }

  public static async publishAsync(opt: {
    noBuild: boolean;
    confFileRelPath: string;
    optNames: string[];
    pkgNames: string[];
  }): Promise<void> {
    const logger = SdLogger.get(["simplysm", "sd-cli", "SdCliProject", "publishAsync"]);

    logger.debug("프로젝트 설정 가져오기...");
    const projConf = (await import(pathToFileURL(path.resolve(process.cwd(), opt.confFileRelPath)).href)).default(
      false,
      opt.optNames,
    ) as ISdProjectConfig;

    logger.debug("프로젝트 package.json 가져오기...");
    const projNpmConf = FsUtils.readJson(path.resolve(process.cwd(), "package.json")) as INpmConfig;

    if (opt.noBuild) {
      logger.warn("빌드하지 않고, 배포하는것은 상당히 위험합니다.");
      await this._waitSecMessageAsync("프로세스를 중지하려면, 'CTRL+C'를 누르세요.", 5);
    }

    // GIT 사용중일 경우, 커밋되지 않은 수정사항이 있는지 확인
    if (FsUtils.exists(path.resolve(process.cwd(), ".git"))) {
      logger.debug("GIT 커밋여부 확인...");
      const gitStatusResult = await SdProcess.spawnAsync("git status");
      if (gitStatusResult.includes("Changes") || gitStatusResult.includes("Untracked")) {
        throw new Error("커밋되지 않은 정보가 있습니다.\n" + gitStatusResult);
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
    if (opt.pkgNames.length !== 0) {
      pkgPaths = pkgPaths.filter((pkgPath) => opt.pkgNames.includes(path.basename(pkgPath)));
    }

    logger.debug("프로젝트 및 패키지 버전 설정...");
    await this._upgradeVersionAsync(projNpmConf, allPkgPaths);

    // 빌드
    if (!opt.noBuild) {
      logger.debug("빌드 프로세스 시작...");
      const multiBuildRunner = new SdMultiBuildRunner();

      const messages = await pkgPaths.parallelAsync(async (pkgPath) => {
        return await multiBuildRunner.runAsync({
          cmd: "build",
          pkgPath,
          projConf: projConf,
        });
      });

      this.#logging(messages.mapMany(), logger);
    }

    // GIT 사용중일경우, 새 버전 커밋 및 TAG 생성
    if (FsUtils.exists(path.resolve(process.cwd(), ".git"))) {
      logger.debug("새 버전 커밋 및 TAG 생성...");
      await SdProcess.spawnAsync("git add .");
      await SdProcess.spawnAsync(`git commit -m "v${projNpmConf.version}"`);
      await SdProcess.spawnAsync(`git tag -a "v${projNpmConf.version}" -m "v${projNpmConf.version}"`);

      logger.debug("새 버전 푸쉬...");
      await SdProcess.spawnAsync("git push");
      await SdProcess.spawnAsync("git push --tags");
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
          const script = postPublishItem.script.replace(/%([^%]*)%/g, (item) => {
            const envName = item.replace(/%/g, "");
            if (!StringUtils.isNullOrEmpty(projNpmConf.version) && envName === "SD_VERSION") {
              return projNpmConf.version;
            }
            if (envName === "SD_PROJECT_PATH") {
              return process.cwd();
            }
            return process.env[envName] ?? item;
          });
          await SdProcess.spawnAsync(script);
        } else {
          throw new NeverEntryError();
        }
      }
    }

    logger.info(`모든 배포가 완료되었습니다. (v${projNpmConf.version})`);
  }

  private static async _publishPkgAsync(pkgPath: string, pkgPubConf: TSdPackageConfig["publish"]): Promise<void> {
    if (pkgPubConf === "npm") {
      await SdProcess.spawnAsync("yarn npm publish --access public", { cwd: pkgPath });
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

      for (const filePath of filePaths) {
        const relativeFilePath = path.relative(path.resolve(pkgPath, "dist"), filePath);
        const targetPath = PathUtils.posix(targetRootPath, relativeFilePath);
        FsUtils.copy(filePath, targetPath);
      }
    } else if (pkgPubConf?.type === "ftp" || pkgPubConf?.type === "ftps" || pkgPubConf?.type === "sftp") {
      const ftp = await SdStorage.connectAsync(pkgPubConf.type, {
        host: pkgPubConf.host,
        port: pkgPubConf.port,
        user: pkgPubConf.user,
        pass: pkgPubConf.pass,
      });
      await ftp.uploadDirAsync(path.resolve(pkgPath, "dist"), pkgPubConf.path ?? "/");
      await ftp.closeAsync();
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

  private static async _upgradeVersionAsync(projNpmConf: INpmConfig, allPkgPaths: string[]): Promise<void> {
    // 작업공간 package.json 버전 설정
    const newVersion = semver.inc(projNpmConf.version, "patch")!;
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
    await allPkgPaths.parallelAsync(async (pkgPath) => {
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
        const cordovaPluginConfXml = await xml2js.parseStringPromise(FsUtils.readFile(cordovaPluginConfFilePath));
        cordovaPluginConfXml.plugin.$.version = newVersion;

        FsUtils.writeFile(cordovaPluginConfFilePath, new xml2js.Builder().buildObject(cordovaPluginConfXml));
      }
    });
  }

  static #logging(buildResults: ISdBuildMessage[], logger: SdLogger): void {
    const messageMap = buildResults.toSetMap(
      (item) => item.severity,
      (item) => SdCliConvertMessageUtils.getBuildMessageString(item),
    );

    if (messageMap.has("message")) {
      logger.log(`알림\n${[...messageMap.get("message")!].join("\n")}`);
    }
    if (messageMap.has("suggestion")) {
      logger.info(`제안\n${[...messageMap.get("suggestion")!].join("\n")}`);
    }
    if (messageMap.has("warning")) {
      logger.warn(`경고\n${[...messageMap.get("warning")!].join("\n")}`);
    }
    if (messageMap.has("error")) {
      logger.error(`오류\n${[...messageMap.get("error")!].join("\n")}`);
    }

    logger.info("모든 빌드가 완료되었습니다.");
  }
}
