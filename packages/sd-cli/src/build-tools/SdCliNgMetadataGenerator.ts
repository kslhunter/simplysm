import * as ts from "typescript";
import { ISdPackageBuildResult } from "../commons";
import * as path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import * as ng from "@angular/compiler-cli";
import { SdCliPathUtil } from "../utils/SdCliPathUtil";

export class SdCliNgMetadataGenerator {
  private readonly _typesPath: string;
  private readonly _srcPath: string;

  private readonly _collector = new ng.MetadataCollector();

  private _getMetadataFilePath(filePath: string): string {
    const relativeFilePath = path.relative(this._srcPath, filePath);
    return path.resolve(this._typesPath, relativeFilePath).replace(/\.ts$/, ".metadata.json");
  }

  public constructor(private readonly _rootPath: string) {
    // this._typesPath = SdCliPathUtil.getDistTypesPath(this._rootPath);
    this._typesPath = path.resolve(this._rootPath, "dist");
    this._srcPath = SdCliPathUtil.getSourcePath(this._rootPath);
  }

  public async removeMetadataAsync(filePath: string): Promise<void> {
    const metadataFilePath = this._getMetadataFilePath(filePath);
    await FsUtil.removeAsync(metadataFilePath);
  }

  public async genMetadataAsync(sourceFile: ts.SourceFile): Promise<ISdPackageBuildResult[]> {
    const result = this.getMetadata(sourceFile);
    if (result.metadata) {
      const filePath = path.resolve(sourceFile.fileName);
      const metadataFilePath = this._getMetadataFilePath(filePath);
      await FsUtil.writeJsonAsync(metadataFilePath, result.metadata);
    }

    return result.results;
  }

  public getMetadata(sourceFile: ts.SourceFile): { metadata?: ng.ModuleMetadata; results: ISdPackageBuildResult[] } {
    const results: ISdPackageBuildResult[] = [];

    const filePath = path.resolve(sourceFile.fileName);

    try {
      const metadata = this._collector.getMetadata(
        sourceFile,
        false, // 에러를 아래에서 함수에서 걸러냄, true일 경우, Error 가 throw 됨
        (value, tsNode) => {
          if (ng.isMetadataError(value)) {
            const pos = sourceFile.getLineAndCharacterOfPosition(typeof tsNode.parent === "undefined" ? tsNode.getStart() : tsNode.pos);
            const line = pos.line + 1;
            const char = pos.character + 1;

            results.push({
              type: "metadata",
              severity: "error",
              filePath,
              message: `${filePath}(${line}, ${char}): error ${value.message}`
            });
          }

          return value;
        }
      );

      return { metadata, results };
    }
    catch (err) {
      if (err instanceof Error) {
        results.push({
          type: "metadata",
          severity: "error",
          filePath,
          message: `${filePath}(0, 0): error ${err.stack ?? err.message}`
        });
      }
      else {
        throw err;
      }
    }

    return { results };
  }
}