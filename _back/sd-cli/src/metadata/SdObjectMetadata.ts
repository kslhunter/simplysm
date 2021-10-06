import { SdMetadataCollector, TSdMetadata } from "./SdMetadataCollector";
import { SdModuleMetadata } from "./SdModuleMetadata";
import { MetadataObject } from "@angular/compiler-cli";

export class SdObjectMetadata {
  public constructor(public collector: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: MetadataObject) {
  }

  public get(key: string): TSdMetadata | undefined {
    const metadata = this.metadata[key];
    return this.collector.getSdMetadata(this.module, metadata);
  }

  public getObject(): Record<string, TSdMetadata> {
    const result = {};
    for (const key of Object.keys(this.metadata)) {
      result[key] = this.collector.getSdMetadata(this.module, this.metadata[key], key);
    }
    return result;
  }
}