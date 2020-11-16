import { SdMetadataCollector, TSdMetadata } from "./SdMetadataCollector";
import { SdModuleMetadata } from "./SdModuleMetadata";
import { FunctionMetadata } from "@angular/compiler-cli";

export class SdFunctionMetadata {
  public constructor(public collector: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public name: string,
                     public metadata: FunctionMetadata) {
  }

  public getValue(): TSdMetadata {
    return this.collector.getSdMetadata(this.module, this.metadata.value);
  }
}