import {MetadataError} from "@angular/compiler-cli";
import {SdMetadataBase} from "./commons";
import {SdMetadataCollector} from "./SdMetadataCollector";
import {SdModuleMetadata} from "./SdModuleMetadata";


export class SdErrorMetadata extends SdMetadataBase {
  public constructor(public pkg: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: MetadataError) {
    super();
  }
}