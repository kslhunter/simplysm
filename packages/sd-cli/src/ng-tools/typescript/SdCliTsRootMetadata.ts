import path from "path";
import ts from "typescript";
import { FsUtil } from "@simplysm/sd-core-node";
import { SdCliTsFileMetadata } from "./SdCliTsFileMetadata";

export class SdCliTsRootMetadata {
  private readonly _fileMetaCache = new Map<string, SdCliTsFileMetadata>();

  public constructor(private readonly _packagePath: string) {
  }

  public removeCaches(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this._fileMetaCache.delete(filePath);
    }
  }

  public getFileMetas(): SdCliTsFileMetadata[] {
    const tsconfigPath = path.resolve(this._packagePath, "tsconfig-build.json");
    const tsconfig = FsUtil.readJson(tsconfigPath);
    const parsedTsconfig = ts.parseJsonConfigFileContent(tsconfig, ts.sys, this._packagePath, tsconfig.angularCompilerOptions);

    const result: SdCliTsFileMetadata[] = [];
    for (const fileName of parsedTsconfig.fileNames) {
      const filePath = path.resolve(fileName);
      const fileMeta = this._fileMetaCache.getOrCreate(filePath, () => new SdCliTsFileMetadata(filePath));
      result.push(fileMeta);
    }

    return result;
  }
}
