import * as ts from "typescript";
import { ISdPackageBuildResult } from "../commons";
import * as path from "path";
import { FsUtil } from "@simplysm/sd-core-node";
import { SdMetadataCollector } from "../metadata/SdMetadataCollector";
import { SdMetadataError } from "../metadata/SdMetadataError";
import { SdCliPathUtil } from "../utils/SdCliPathUtil";
import * as ng from "@angular/compiler-cli";

/**
 * NgModule 파일 생성
 */
export class SdCliNgModuleGenerator {
  private _sdMetadataCollector?: SdMetadataCollector;

  private async _getSdMetadataCollectorAsync(): Promise<SdMetadataCollector> {
    if (!this._sdMetadataCollector) {
      this._sdMetadataCollector = new SdMetadataCollector(this._rootPath, this._modulesGenPath);
      await this._sdMetadataCollector.initializeAsync();
    }
    return this._sdMetadataCollector;
  }

  public constructor(private readonly _rootPath: string,
                     private readonly _modulesGenPath: string) {
  }

  public async registerAsync(sourceFile: ts.SourceFile, metadata?: ng.ModuleMetadata): Promise<void> {
    if (metadata) {
      const collector = await this._getSdMetadataCollectorAsync();
      collector.register(sourceFile, metadata);
    }
    else {
      const filePath = path.resolve(sourceFile.fileName);

      const metadataFilePath = SdCliPathUtil.getMetadataFilePath(this._rootPath, filePath);
      if (metadataFilePath === undefined) return;
      if (!FsUtil.exists(metadataFilePath)) return;

      const fileMetadata = await FsUtil.readJsonAsync(metadataFilePath);

      const collector = await this._getSdMetadataCollectorAsync();
      collector.register(sourceFile, fileMetadata);
    }
  }

  public async deleteAsync(filePath: string): Promise<void> {
    const collector = await this._getSdMetadataCollectorAsync();
    collector.delete(filePath);
  }

  public async genAsync(): Promise<ISdPackageBuildResult[]> {
    const results: ISdPackageBuildResult[] = [];

    // METADATA를 이용하여 MODULE 파일 생성
    try {
      const collector = await this._getSdMetadataCollectorAsync();
      await collector.generateAsync();
    }
    catch (err) {
      if (err instanceof SdMetadataError) {
        results.push({
          filePath: err.filePath,
          type: "metadata",
          severity: "error",
          message: `${err.filePath}(0, 0): error ${err.message}`
        });
      }
      else {
        results.push({
          filePath: undefined,
          type: "metadata",
          severity: "error",
          message: err.stack
        });
      }
    }

    return results;
  }
}