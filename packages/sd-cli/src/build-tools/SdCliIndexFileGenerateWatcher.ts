import { SdCliPathUtil } from "../utils/SdCliPathUtil";
import { FsUtil, Logger, PathUtil } from "@simplysm/sd-core-node";
import * as path from "path";
import { ITsConfig } from "../commons";
import * as os from "os";

export class SdCliIndexFileGenerateWatcher {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", this.constructor.name]);

  private _contentCache?: string;

  public constructor(private readonly _rootPath: string,
                     private readonly _polyfills: string[] | undefined) {
  }

  public async watchAsync(): Promise<void> {
    const indexTsFilePath = SdCliPathUtil.getIndexFilePath(this._rootPath);
    if (FsUtil.exists(indexTsFilePath)) {
      this._contentCache = await FsUtil.readFileAsync(indexTsFilePath);
    }

    await FsUtil.watchAsync(
      path.resolve(SdCliPathUtil.getSourcePath(this._rootPath), "**", "*.ts"),
      async (changedInfos) => {
        if (changedInfos.every((item) => item.filePath === indexTsFilePath)) return;
        await this._genIndexAsync(indexTsFilePath);
      },
      (err) => {
        this._logger.error(err);
      },
      { useFirstRun: true }
    );
  }

  private async _genIndexAsync(indexTsFilePath: string): Promise<void> {
    const importTexts: string[] = [];

    // simplysm.json 에 등록된 polyfills 를 모두 import
    const polyfills = this._polyfills ?? [];
    for (const polyfill of polyfills) {
      importTexts.push(`import "${polyfill}";`);
    }

    // 모든 파일 목록 가져오기
    const allFilePaths = await FsUtil.globAsync(path.resolve(SdCliPathUtil.getSourcePath(this._rootPath), "**", "*.ts"));

    // ENTRY 파일 목록 가져오기
    const baseTsconfigFilePath = SdCliPathUtil.getTsConfigBaseFilePath(this._rootPath);
    const baseTsconfig: ITsConfig = await FsUtil.readJsonAsync(baseTsconfigFilePath);
    const entryFilePaths = baseTsconfig.files?.map((item) => path.resolve(this._rootPath, item)) ?? [];

    // 사용할 파일 목록 가져오기
    const validFiles = allFilePaths.filter((item) => !entryFilePaths.includes(item));

    // 파일들 import
    for (const validFile of validFiles) {
      const requirePath = PathUtil.posix(path.relative(path.dirname(indexTsFilePath), validFile)).replace(/\.ts$/, "");

      if (!FsUtil.exists(validFile)) continue;

      const sourceTsFileContent = await FsUtil.readFileAsync(validFile);
      if (sourceTsFileContent.split("\n").some((line) => line.startsWith("export "))) {
        importTexts.push(`export * from "./${requirePath}";`);
      }
      else {
        importTexts.push(`import "./${requirePath}";`);
      }
    }

    const content = importTexts.join(os.EOL) + os.EOL;
    if (content !== this._contentCache) {
      await FsUtil.writeFileAsync(indexTsFilePath, content);
      this._contentCache = content;
    }
  }
}