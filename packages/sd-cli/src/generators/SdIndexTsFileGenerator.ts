import {NotImplementError} from "@simplysm/sd-core-common";
import {FsUtil} from "@simplysm/sd-core-node";
import * as path from "path";

export class SdIndexTsFileGenerator {
  private _cache = "";

  public constructor(private readonly _indexTsFilePath: string,
                     private readonly _polyfills: string[],
                     private readonly _srcPath: string) {
    if (FsUtil.exists(this._indexTsFilePath)) {
      this._cache = FsUtil.readFile(this._indexTsFilePath);
    }
  }

  public async generateAsync(): Promise<boolean> {
    if (!this._indexTsFilePath) throw new NotImplementError();

    const importTexts: string[] = [];
    if (this._polyfills) {
      for (const polyfill of this._polyfills) {
        importTexts.push(`import "${polyfill}";`);
      }
    }

    const srcTsFiles = await FsUtil.globAsync(path.resolve(this._srcPath, "**", "*.ts"));
    for (const srcTsFile of srcTsFiles) {
      if (path.resolve(srcTsFile) === this._indexTsFilePath) {
        continue;
      }

      const requirePath = path.relative(path.dirname(this._indexTsFilePath), srcTsFile)
        .replace(/\\/g, "/")
        .replace(/\.ts$/, "");

      const contents = await FsUtil.readFileAsync(srcTsFile);
      if (contents.split("\n").some((line) => /^export /.test(line))) {
        importTexts.push(`export * from "./${requirePath}";`);
      }
      else {
        importTexts.push(`import "./${requirePath}";`);
      }
    }

    const content = importTexts.join("\n") + "\n";
    if (this._cache !== content) {
      this._cache = content;
      await FsUtil.writeFileAsync(this._indexTsFilePath, content);
      return true;
    }

    return false;
  }
}