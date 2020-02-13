import {ClassMetadata, MetadataArray, MetadataEntry} from "@angular/compiler-cli";
import {NotImplementError} from "@simplysm/sd-core-common";
import {isMetadataArrayExpression, isMetadataObjectExpression, SdMetadataBase, TSdMetadata} from "./commons";
import {SdCallMetadata} from "./SdCallMetadata";
import {SdMetadataCollector} from "./SdMetadataCollector";
import {SdModuleMetadata} from "./SdModuleMetadata";


export class SdClassMetadata extends SdMetadataBase {
  public get decorators(): SdCallMetadata[] {
    const metadata = this.metadata.decorators ?? [] as MetadataArray;

    const real = this.pkg.findRealMetadata(this.module, metadata);
    if (!isMetadataArrayExpression(real.metadata)) throw new NotImplementError();
    const arr = this.pkg.getSdMetadataArray(real.module, real.metadata);

    return arr.map((item) => {
      if (!(item instanceof SdCallMetadata)) throw new NotImplementError();
      return item;
    });
  }

  public get statics(): { [key: string]: TSdMetadata } {
    if (this.metadata.statics) {
      const metadata = this.metadata.statics as MetadataEntry;
      const real = this.pkg.findRealMetadata(this.module, metadata);
      if (!isMetadataObjectExpression(real.metadata)) throw new NotImplementError();
      return this.pkg.getSdMetadataObject(real.module, real.metadata);
    }

    return {};
  }

  public get name(): string | undefined {
    return Object.keys(this.module.metadata.metadata)
      .single((key) => this.module.metadata.metadata[key] === this.metadata);
  }

  public constructor(public pkg: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: ClassMetadata) {
    super();
  }
}