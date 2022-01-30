import { FsUtil, Logger, SdProcess } from "@simplysm/sd-core-node";
import path from "path";
import { SdCliPackage } from "../packages/SdCliPackage";
import { Wait } from "@simplysm/sd-core-common";
import os from "os";
import { SdBuildResultUtil } from "../utils/SdBuildResultUtil";
import semver from "semver/preload";
export class SdCliWorkspace {
    constructor(_rootPath) {
        this._rootPath = _rootPath;
        this._logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);
        const npmConfigFilePath = path.resolve(this._rootPath, "package.json");
        this._npmConfig = FsUtil.readJson(npmConfigFilePath);
        this._config = FsUtil.readJson(path.resolve(this._rootPath, "simplysm.json"));
    }
    async watchAsync() {
        this._logger.debug("패키지 목록 구성...");
        const pkgs = await this._getPackagesAsync();
        this._logger.debug("패키지 이벤트 설정...");
        let changeCount = 0;
        const totalResultMap = new Map();
        for (const pkg of pkgs) {
            pkg
                .on("change", () => {
                if (changeCount === 0) {
                    this._logger.log("빌드를 시작합니다...");
                }
                changeCount++;
                this._logger.debug(`[${pkg.name}] 빌드를 시작합니다...`);
            })
                .on("complete", (results) => {
                this._logger.debug(`[${pkg.name}] 빌드가 완료되었습니다.`);
                totalResultMap.set(pkg.name, results);
                setTimeout(() => {
                    changeCount--;
                    if (changeCount === 0) {
                        this._loggingResults(totalResultMap);
                        this._logger.info("모든 빌드가 완료되었습니다.");
                    }
                }, 500);
            });
        }
        this._logger.debug("빌드를 시작합니다...");
        const pkgNames = pkgs.map((item) => item.name);
        const buildCompletedPackageNames = [];
        await pkgs.parallelAsync(async (pkg) => {
            await Wait.until(() => !pkg.allDependencies.some((dep) => pkgNames.includes(dep) && !buildCompletedPackageNames.includes(dep)));
            await pkg.watchAsync();
            buildCompletedPackageNames.push(pkg.name);
        });
    }
    async buildAsync() {
        this._logger.debug("패키지 목록 구성...");
        const pkgs = await this._getPackagesAsync();
        this._logger.debug("프로젝트 및 패키지 버전 설정...");
        await this._upgradeVersionAsync(pkgs);
        // 빌드
        await this._buildPkgsAsync(pkgs);
    }
    async _buildPkgsAsync(pkgs) {
        this._logger.debug("빌드를 시작합니다...");
        const pkgNames = pkgs.map((item) => item.name);
        const buildCompletedPackageNames = [];
        const totalResultMap = new Map();
        await pkgs.parallelAsync(async (pkg) => {
            await Wait.until(() => !pkg.allDependencies.some((dep) => pkgNames.includes(dep) && !buildCompletedPackageNames.includes(dep)));
            this._logger.debug(`[${pkg.name}] 빌드를 시작합니다...`);
            totalResultMap.set(pkg.name, await pkg.buildAsync());
            this._logger.debug(`[${pkg.name}] 빌드가 완료되었습니다.`);
            buildCompletedPackageNames.push(pkg.name);
        });
        this._loggingResults(totalResultMap);
        this._logger.info("모든 빌드가 완료되었습니다.");
    }
    async publishAsync(opt) {
        if (opt.noBuild) {
            this._logger.warn("빌드하지 않고, 배포하는것은 상당히 위험합니다.");
            await this._waitSecMessageAsync("프로세스를 중지하려면, 'CTRL+C'를 누르세요.", 5);
        }
        // GIT 사용중일 경우, 커밋되지 않은 수정사항이 있는지 확인
        if (FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
            this._logger.debug("GIT 커밋여부 확인...");
            const gitStatusResult = await SdProcess.execAsync("git status");
            if (gitStatusResult.includes("Changes") || gitStatusResult.includes("Untracked")) {
                throw new Error("커밋되지 않은 정보가 있습니다.");
            }
        }
        this._logger.debug("패키지 목록 구성...");
        const pkgs = await this._getPackagesAsync();
        this._logger.debug("프로젝트 및 패키지 버전 설정...");
        await this._upgradeVersionAsync(pkgs);
        // 빌드
        if (!opt.noBuild) {
            await this._buildPkgsAsync(pkgs);
        }
        // GIT 사용중일경우, 새 버전 커밋 및 TAG 생성
        if (FsUtil.exists(path.resolve(process.cwd(), ".git"))) {
            this._logger.debug("새 버전 커밋 및 TAG 생성...");
            await SdProcess.execAsync("git add .");
            await SdProcess.execAsync(`git commit -m "v${this._npmConfig.version}"`);
            await SdProcess.execAsync(`git tag -a "v${this._npmConfig.version}" -m "v${this._npmConfig.version}"`);
        }
        this._logger.debug("배포 시작...");
        await pkgs.parallelAsync(async (pkg) => {
            this._logger.debug(`[${pkg.name}] 배포를 시작합니다...`);
            await pkg.publishAsync();
            this._logger.debug(`[${pkg.name}] 배포가 완료되었습니다.`);
        });
        this._logger.info("모든 배포가 완료되었습니다.");
    }
    async _upgradeVersionAsync(pkgs) {
        // 작업공간 package.json 버전 설정
        const newVersion = semver.inc(this._npmConfig.version, "patch");
        this._npmConfig.version = newVersion;
        const pkgNames = pkgs.map((item) => item.name);
        const updateDepVersion = (deps) => {
            if (!deps)
                return;
            for (const depName of Object.keys(deps)) {
                if (pkgNames.includes(depName)) {
                    deps[depName] = newVersion;
                }
            }
        };
        updateDepVersion(this._npmConfig.dependencies);
        updateDepVersion(this._npmConfig.optionalDependencies);
        updateDepVersion(this._npmConfig.devDependencies);
        updateDepVersion(this._npmConfig.peerDependencies);
        const npmConfigFilePath = path.resolve(this._rootPath, "package.json");
        await FsUtil.writeJsonAsync(npmConfigFilePath, this._npmConfig, { space: 2 });
        // 각 패키지 package.json 버전 설정
        await pkgs.parallelAsync(async (pkg) => {
            await pkg.setNewVersionAsync(newVersion, pkgNames);
        });
    }
    async _waitSecMessageAsync(msg, sec) {
        for (let i = sec; i > 0; i--) {
            if (i !== sec) {
                process.stdout.cursorTo(0);
            }
            process.stdout.write(msg + " " + i);
            await Wait.time(1000);
        }
        process.stdout.cursorTo(0);
        process.stdout.clearLine(0);
    }
    async _getPackagesAsync() {
        const pkgRootPaths = await this._npmConfig.workspaces?.mapManyAsync(async (item) => await FsUtil.globAsync(item));
        if (!pkgRootPaths) {
            throw new Error("최상위 'package.json'에서 'workspaces'를 찾을 수 없습니다.");
        }
        return pkgRootPaths.map((pkgRootPath) => {
            const pkgConfig = this._config.packages[path.basename(pkgRootPath)];
            return pkgConfig ? new SdCliPackage(this._rootPath, pkgRootPath, pkgConfig) : undefined;
        }).filterExists();
    }
    _loggingResults(totalResultMap) {
        const totalResults = Array.from(totalResultMap.entries())
            .mapMany((item) => item[1].map((item1) => ({
            pkgName: item[0],
            ...item1
        })))
            .orderBy((item) => item.pkgName + "_" + item.filePath);
        const warnings = totalResults
            .filter((item) => item.severity === "warning")
            .map((item) => `${SdBuildResultUtil.getMessage(item)} (${item.pkgName})`)
            .distinct();
        const errors = totalResults
            .filter((item) => item.severity === "error")
            .map((item) => `${SdBuildResultUtil.getMessage(item)} (${item.pkgName})`)
            .distinct();
        if (warnings.length > 0) {
            this._logger.warn(`경고 발생${os.EOL}`, warnings.join(os.EOL));
        }
        if (errors.length > 0) {
            this._logger.error(`오류 발생${os.EOL}`, errors.join(os.EOL));
        }
        if (errors.length > 0) {
            this._logger.error(`경고: ${warnings.length}건, 오류: ${errors.length}건`);
        }
        else if (warnings.length > 0) {
            this._logger.warn(`경고: ${warnings.length}건, 오류: ${errors.length}건`);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2RDbGlXb3Jrc3BhY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZW50cnktcG9pbnRzL1NkQ2xpV29ya3NwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ25FLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUV4QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDeEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQztBQUNwQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMvRCxPQUFPLE1BQU0sTUFBTSxnQkFBZ0IsQ0FBQztBQUVwQyxNQUFNLE9BQU8sY0FBYztJQU16QixZQUFvQyxTQUFpQjtRQUFqQixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBTHBDLFlBQU8sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFNbkYsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFckQsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFFTSxLQUFLLENBQUMsVUFBVTtRQUNyQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FB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