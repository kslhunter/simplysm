import { MetadataArray } from "@angular/compiler-cli";
import { SdMetadataCollector } from "./SdMetadataCollector";
import { SdModuleMetadata } from "./SdModuleMetadata";
import { SdMetadataBase, TSdMetadata } from "./commons";


export class SdArrayMetadata extends SdMetadataBase implements Iterable<TSdMetadata> {
  public sdMetadataList: TSdMetadata[];

  public [Symbol.iterator](): Iterator<TSdMetadata> {
    let index = 0;
    return {
      next: (): { done: boolean; value: TSdMetadata } => {
        const value = this.sdMetadataList[index];
        index += 1;

        return {
          done: index > this.sdMetadataList.length,
          value
        };
      }
    };
  }

  public constructor(public readonly pkg: SdMetadataCollector,
                     public readonly module: SdModuleMetadata,
                     public readonly arr: MetadataArray) {
    super();

    this.sdMetadataList = this.pkg.getSdMetadataArray(module, arr);
  }
}