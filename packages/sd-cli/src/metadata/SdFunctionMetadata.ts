import {FunctionMetadata} from "@angular/compiler-cli";
import {SdMetadataBase, TSdMetadata} from "./commons";
import {SdMetadataCollector} from "./SdMetadataCollector";
import {SdModuleMetadata} from "./SdModuleMetadata";


export class SdFunctionMetadata extends SdMetadataBase {
  public get value(): TSdMetadata {
    return this.pkg.getSdMetadata(this.module, this.metadata.value);
  }

  public constructor(public readonly pkg: SdMetadataCollector,
                     public readonly module: SdModuleMetadata,
                     public readonly metadata: FunctionMetadata) {
    super();
  }
}