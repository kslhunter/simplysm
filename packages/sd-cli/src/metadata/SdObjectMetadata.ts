import { NeverEntryError } from "@simplysm/sd-core-common";
import { MetadataObject } from "@angular/compiler-cli";
import { isMetadataObjectExpression, SdMetadataBase, TSdMetadata } from "./commons";
import { SdMetadataCollector } from "./SdMetadataCollector";
import { SdModuleMetadata } from "./SdModuleMetadata";


export class SdObjectMetadata extends SdMetadataBase {
  public get(key: string): TSdMetadata {
    const realObj = this.pkg.findRealMetadata(this.module, this.metadata);
    if (!realObj) return undefined;

    if (!isMetadataObjectExpression(realObj.metadata)) throw new NeverEntryError();

    if (realObj.metadata[key] !== undefined) {
      return this.pkg.getSdMetadata(this.module, realObj.metadata[key]);
    }
    else {
      return undefined;
    }
  }

  public keys(): string[] {
    const real = this.pkg.findRealMetadata(this.module, this.metadata);
    if (!real) return [];

    if (!isMetadataObjectExpression(real.metadata)) throw new NeverEntryError();
    return Object.keys(real.metadata);
  }

  public constructor(public readonly pkg: SdMetadataCollector,
                     public readonly module: SdModuleMetadata,
                     public readonly metadata: MetadataObject) {
    super();
  }
}