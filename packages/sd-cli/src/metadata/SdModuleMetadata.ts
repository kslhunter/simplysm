import {MetadataEntry, ModuleMetadata} from "@angular/compiler-cli";
import * as path from "path";
import {NotImplementError} from "@simplysm/sd-core-common";
import {FsUtil} from "@simplysm/sd-core-node";
import {SdMetadataCollector} from "./SdMetadataCollector";
import {isMetadataObjectExpression, TSdMetadata} from "./commons";


export class SdModuleMetadata {
  public readonly name: string;
  public readonly isLibrary: boolean;
  public readonly items: { [key: string]: TSdMetadata };

  public constructor(public pkg: SdMetadataCollector,
                     public metadata: ModuleMetadata,
                     public filePath: string) {
    // name
    this.name = this.metadata.importAs ?? this._getNpmConfig().name;

    // isLibrary
    this.isLibrary = path.relative(this.pkg.distPath, filePath).includes("..");

    // items
    if (!this.metadata.metadata) throw new NotImplementError();
    const itemMetadata = this.metadata.metadata as MetadataEntry;
    if (!isMetadataObjectExpression(itemMetadata)) throw new NotImplementError();
    this.items = this.pkg.getSdMetadataObject(this, itemMetadata);
  }

  private _getNpmConfig(): any {
    let cursorDirPath = path.dirname(this.filePath);
    while (true) {
      if (FsUtil.exists(path.resolve(cursorDirPath, "package.json"))) {
        break;
      }
      cursorDirPath = path.dirname(cursorDirPath);
    }
    const npmConfigFilePath = path.resolve(cursorDirPath, "package.json");
    return FsUtil.readJson(npmConfigFilePath);
  }
}