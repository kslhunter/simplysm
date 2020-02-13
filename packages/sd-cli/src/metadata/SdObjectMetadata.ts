import {NotImplementError} from "@simplysm/sd-core-common";
import {MetadataObject} from "@angular/compiler-cli";
import {isMetadataObjectExpression, SdMetadataBase, TSdMetadata} from "./commons";
import {SdMetadataCollector} from "./SdMetadataCollector";
import {SdModuleMetadata} from "./SdModuleMetadata";


export class SdObjectMetadata extends SdMetadataBase {
  public get(key: string): TSdMetadata {
    const realObj = this.pkg.findRealMetadata(this.module, this.metadata);
    if (!isMetadataObjectExpression(realObj.metadata)) throw new NotImplementError();

    if (realObj.metadata[key]) {
      return this.pkg.getSdMetadata(this.module, realObj.metadata[key]);
    }
    else {
      return undefined;
    }
  }

  public keys(): string[] {
    const real = this.pkg.findRealMetadata(this.module, this.metadata);
    if (!isMetadataObjectExpression(real.metadata)) throw new NotImplementError();
    return Object.keys(real.metadata);
  }

  public constructor(public pkg: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: MetadataObject) {
    super();
  }
}