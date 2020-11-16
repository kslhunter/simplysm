import { FsUtil, Logger } from "@simplysm/sd-core-node";

const lockfile = require("@yarnpkg/lockfile");

export class SdCliCheck {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public async checkAsync(): Promise<void> {
    let hasError = false;

    //----------------------------
    // yarn.lock 체크
    //----------------------------
    const lockFileContent = await FsUtil.readFileAsync("yarn.lock");
    const lockFileObj = lockfile.parse(lockFileContent);

    // @simplysm/* 패키지의 버전 혼재 체크
    if (!this._checkMultipleVersion(lockFileObj, "@simplysm/")) {
      this._logger.error("'@simplysm/*' 패키지의 버전이 혼재되어 있습니다.");
      hasError = true;
    }

    // rxjs 패키지의 버전 혼재 체크
    if (!this._checkMultipleVersion(lockFileObj, "rxjs")) {
      this._logger.error("'rxjs' 패키지의 버전이 혼재되어 있습니다.");
      hasError = true;
    }

    // zone.js 패키지의 버전 혼재 체크
    if (!this._checkMultipleVersion(lockFileObj, "zone.js")) {
      this._logger.error("'zone.js' 패키지의 버전이 혼재되어 있습니다.");
      hasError = true;
    }

    //----------------------------
    if (!hasError) {
      this._logger.log("문제가 발견되지 않았습니다.");
    }
  }

  private _checkMultipleVersion(lockFileObj: any, packagePrefix: string): boolean {
    const packageVersions = Object.keys(lockFileObj.object)
      .filter((key) => key.startsWith(packagePrefix))
      .map((key) => lockFileObj.object[key].version);
    return packageVersions.distinct().length <= 1;
  }
}