import {MetadataArray} from "@angular/compiler-cli";
import {SdMetadataCollector} from "./SdMetadataCollector";
import {SdModuleMetadata} from "./SdModuleMetadata";
import {SdMetadataBase, TSdMetadata} from "./commons";


export class SdArrayMetadata extends SdMetadataBase implements Iterable<TSdMetadata> {
  public sdMetadataList: TSdMetadata[];

  public [Symbol.iterator](): Iterator<TSdMetadata> {
    let index = 0;
    return {
      next: () => {
        const value = this.sdMetadataList[index];
        index++;

        return {
          done: index > this.sdMetadataList.length,
          value
        };
      }
    };
  }

  public constructor(public pkg: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public arr: MetadataArray) {
    super();

    this.sdMetadataList = this.pkg.getSdMetadataArray(module, arr);
  }
}