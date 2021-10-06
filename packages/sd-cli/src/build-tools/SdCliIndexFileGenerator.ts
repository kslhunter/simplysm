import { ISdAutoIndexConfig, ISdPackageBuildResult, ITsconfig } from "../commons";
import * as path from "path";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import * as os from "os";

export class SdCliIndexFileGenerator {
  public readonly indexFilePath = PathUtil.posix(this.rootPath, "src/index.ts");

  public constructor(public readonly rootPath: string,
                     public readonly config: ISdAutoIndexConfig) {
  }


  public async generateAsync(): Promise<{ result: ISdPackageBuildResult[]; changed: boolean }> {
    const importTexts: string[] = [];

    // simplysm.json 에 등록된 polyfills 를 모두 import
    if (this.config.polyfills) {
      for (const polyfill of this.config.polyfills) {
        importTexts.push(`import "${polyfill}";`);
      }
    }

    // 파일들 import
    const filePaths = await this._getFilePathsAsync();
    for (const filePath of filePaths) {
      const requirePath = PathUtil.posix(path.relative(path.dirname(this.indexFilePath), filePath))
        .replace(/\.ts$/, "")
        .replace(/\/index$/, "");

      const sourceTsFileContent = await FsUtil.readFileAsync(filePath);
      if (sourceTsFileContent.split("\n").some((line) => line.startsWith("export "))) {
        importTexts.push(`export * from "./${requirePath}";`);
      }
      else {
        importTexts.push(`import "./${requirePath}";`);
      }
    }

    let changed = false;
    const content = importTexts.join(os.EOL) + os.EOL;
    const prevContent = FsUtil.exists(this.indexFilePath) ? FsUtil.readFile(this.indexFilePath) : undefined;
    if (content !== prevContent) {
      await FsUtil.writeFileAsync(this.indexFilePath, content);
      changed = true;
    }

    return { result: [], changed };
  }

  private async _getFilePathsAsync(): Promise<string[]> {
    const tsconfig: ITsconfig = await FsUtil.readJsonAsync(path.resolve(this.rootPath, "tsconfig.json"));
    const entryFilePaths = tsconfig.files?.map((item) => path.resolve(this.rootPath, item)) ?? [];

    return (await FsUtil.globAsync(path.resolve(this.rootPath, "src/**/*.ts"), { nodir: true }))
      .filter((item) => (
        !entryFilePaths.includes(item)
        && item !== this.indexFilePath
      ));
  }
}
