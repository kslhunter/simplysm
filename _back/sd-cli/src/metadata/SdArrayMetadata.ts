import { SdMetadataCollector, TSdMetadata } from "./SdMetadataCollector";
import { SdModuleMetadata } from "./SdModuleMetadata";
import { MetadataEntry } from "@angular/compiler-cli";

export class SdArrayMetadata {
  public constructor(public collector: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: MetadataEntry[]) {
  }

  public get(index: number): TSdMetadata | undefined {
    const metadata = this.metadata[index];
    return this.collector.getSdMetadata(this.module, metadata);
  }

  public getArray(): TSdMetadata[] {
    return this.metadata.mapMany((item) => {
      const result = this.collector.getSdMetadata(this.module, item);
      if (result instanceof SdArrayMetadata) {
        return result.getArray();
      }
      else {
        return [result];
      }
    });
  }
}