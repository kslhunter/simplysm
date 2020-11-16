import { SdMetadataCollector } from "./SdMetadataCollector";
import { SdModuleMetadata } from "./SdModuleMetadata";
import { MetadataError } from "@angular/compiler-cli";

export class SdErrorMetadata {
  public constructor(public collector: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: MetadataError) {
  }
}