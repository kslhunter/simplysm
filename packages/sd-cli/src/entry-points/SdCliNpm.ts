import { Logger, SdProcess } from "@simplysm/sd-core-node";
import { SdCliPrepare } from "./SdCliPrepare";

export class SdCliNpm {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  public constructor(private readonly _rootPath: string) {
  }

  public async updateAsync(): Promise<void> {
    this._logger.debug("업데이트할 패키지 확인...");
    await SdProcess.spawnAsync("npm outdated", { cwd: this._rootPath });

    this._logger.debug("업데이트 시작...");
    await SdProcess.spawnAsync("npm update", { cwd: this._rootPath });

    this._logger.debug("sd-cli 준비...");
    await new SdCliPrepare().prepareAsync();

    this._logger.info("노드 패키지 업데이트 완료");
  }
}
