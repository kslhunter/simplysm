import {ClassMetadata, isClassMetadata, MetadataArray, MetadataEntry} from "@angular/compiler-cli";
import {NeverEntryError} from "@simplysm/sd-core-common";
import {isMetadataArrayExpression, isMetadataObjectExpression, SdMetadataBase, TSdMetadata} from "./commons";
import {SdCallMetadata} from "./SdCallMetadata";
import {SdMetadataCollector} from "./SdMetadataCollector";
import {SdModuleMetadata} from "./SdModuleMetadata";


export class SdClassMetadata extends SdMetadataBase {
  public get decorators(): SdCallMetadata[] {
    const metadata = this.metadata.decorators ?? [] as MetadataArray;

    const real = this.pkg.findRealMetadata(this.module, metadata);
    if (!real) return [];
    if (!isMetadataArrayExpression(real.metadata)) throw new NeverEntryError();
    const arr = this.pkg.getSdMetadataArray(real.module, real.metadata);

    return arr.map(item => {
      if (!(item instanceof SdCallMetadata)) throw new NeverEntryError();
      return item;
    });
  }

  public get statics(): { [key: string]: TSdMetadata } {
    if (this.metadata.statics) {
      const metadata = this.metadata.statics as MetadataEntry;
      const real = this.pkg.findRealMetadata(this.module, metadata);
      if (!real) return {};

      if (!isMetadataObjectExpression(real.metadata)) throw new NeverEntryError();
      return this.pkg.getSdMetadataObject(real.module, real.metadata);
    }

    return {};
  }

  public get extends(): SdClassMetadata | undefined {
    if (this.metadata.extends) {
      const metadata = this.metadata.extends as MetadataEntry;
      const real = this.pkg.findRealMetadata(this.module, metadata);
      if (!real) return undefined;

      if (!isClassMetadata(real.metadata)) throw new NeverEntryError();
      return this.pkg.getSdMetadata(real.module, real.metadata) as SdClassMetadata;
    }

    return undefined;
  }

  public get name(): string | undefined {
    return Object.keys(this.module.metadata.metadata)
      .single(key => this.module.metadata.metadata[key] === this.metadata);
  }

  public constructor(public readonly pkg: SdMetadataCollector,
                     public readonly module: SdModuleMetadata,
                     public readonly metadata: ClassMetadata) {
    super();
  }
}