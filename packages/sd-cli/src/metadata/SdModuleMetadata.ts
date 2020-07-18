import { MetadataEntry, ModuleMetadata } from "@angular/compiler-cli";
import * as path from "path";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { FsUtils } from "@simplysm/sd-core-node";
import { SdMetadataCollector } from "./SdMetadataCollector";
import { isMetadataObjectExpression, TSdMetadata } from "./commons";


export class SdModuleMetadata {
  public readonly name: string;
  public readonly items: { [key: string]: TSdMetadata };

  public constructor(public readonly pkg: SdMetadataCollector,
                     public readonly metadata: ModuleMetadata,
                     public readonly filePath: string) {
    // name
    this.name = this.metadata.importAs ?? this._getNpmConfig().name;

    // items
    if (this.metadata.metadata === undefined) throw new NeverEntryError();
    const itemMetadata = this.metadata.metadata as MetadataEntry;
    if (!isMetadataObjectExpression(itemMetadata)) throw new NeverEntryError();
    this.items = this.pkg.getSdMetadataObject(this, itemMetadata);
  }

  private _getNpmConfig(): any {
    let cursorDirPath = path.dirname(this.filePath);
    while (true) {
      if (FsUtils.exists(path.resolve(cursorDirPath, "package.json"))) {
        break;
      }
      cursorDirPath = path.dirname(cursorDirPath);
    }
    const npmConfigFilePath = path.resolve(cursorDirPath, "package.json");
    return FsUtils.readJson(npmConfigFilePath);
  }
}