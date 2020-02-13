import {FunctionMetadata} from "@angular/compiler-cli";
import {SdMetadataBase, TSdMetadata} from "./commons";
import {SdMetadataCollector} from "./SdMetadataCollector";
import {SdModuleMetadata} from "./SdModuleMetadata";


export class SdFunctionMetadata extends SdMetadataBase {
  public get value(): TSdMetadata {
    return this.pkg.getSdMetadata(this.module, this.metadata.value);
  }

  public constructor(public pkg: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: FunctionMetadata) {
    super();
  }
}