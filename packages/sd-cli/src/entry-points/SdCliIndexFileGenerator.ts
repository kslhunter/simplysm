import { ITsconfig } from "../commons";
import * as path from "path";
import { FsUtil, PathUtil } from "@simplysm/sd-core-node";
import * as os from "os";
import * as chokidar from "chokidar";

export class SdCliIndexFileGenerator {
  private readonly _indexFilePath = path.resolve(this.rootPath, "src/index.ts");
  private _contentCache: string | undefined;

  public constructor(public readonly rootPath: string,
                     public readonly config: ISdAutoIndexConfig) {
  }

  public async watchAsync(): Promise<void> {
    const watcher = chokidar.watch([path.resolve(this.rootPath, "src")], { persistent: true });
    watcher.on("add", async (filePath) => {
      if (filePath.endsWith(".ts")) {
        await this.runAsync();
      }
    });
    watcher.on("unlink", async (filePath) => {
      if (filePath.endsWith(".ts")) {
        await this.runAsync();
      }
    });

    await this.runAsync();
  }

  public async runAsync(): Promise<void> {
    const importTexts: string[] = [];

    // 옵션의 polyfills 를 모두 import
    if (this.config.polyfills) {
      for (const polyfill of this.config.polyfills) {
        importTexts.push(`import "${polyfill}";`);
      }
    }

    // 내부 파일들 import
    const filePaths = await this._getFilePathsAsync();
    for (const filePath of filePaths) {
      const requirePath = PathUtil.posix(path.relative(path.dirname(this._indexFilePath), filePath))
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

    const content = importTexts.join(os.EOL) + os.EOL;
    const prevContent = this._contentCache ?? (FsUtil.exists(this._indexFilePath) ? FsUtil.readFile(this._indexFilePath) : undefined);
    this._contentCache = content;
    if (content !== prevContent) {
      await FsUtil.writeFileAsync(this._indexFilePath, content);
    }
  }

  private async _getFilePathsAsync(): Promise<string[]> {
    const tsconfig: ITsconfig = await FsUtil.readJsonAsync(path.resolve(this.rootPath, "tsconfig.json"));
    const entryFilePaths = tsconfig.files?.map((item) => path.resolve(this.rootPath, item)) ?? [];

    return (await FsUtil.globAsync(path.resolve(this.rootPath, "src/**/*.ts"), { nodir: true }))
      .filter((item) => (
        !entryFilePaths.includes(item)
        && item !== this._indexFilePath
      ));
  }
}

export interface ISdAutoIndexConfig {
  polyfills?: string[];
}
