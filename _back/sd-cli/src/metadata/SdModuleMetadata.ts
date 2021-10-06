import { MetadataEntry } from "@angular/compiler-cli";
import { SdMetadataCollector, TSdMetadata } from "./SdMetadataCollector";

export class SdModuleMetadata {
  public constructor(public collector: SdMetadataCollector,
                     public filePath: string,
                     public name: string,
                     public metadataObj: Record<string, MetadataEntry>) {
  }

  public getMetadatas(): TSdMetadata[] {
    return Object.keys(this.metadataObj)
      .map((metadataName) => this.collector.getSdMetadata(this, this.metadataObj[metadataName], metadataName))
      .filterExists();
  }
}