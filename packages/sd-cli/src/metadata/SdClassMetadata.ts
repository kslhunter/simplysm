import { SdMetadataCollector } from "./SdMetadataCollector";
import { ClassMetadata } from "@angular/compiler-cli";
import { SdModuleMetadata } from "./SdModuleMetadata";
import { SdCallMetadata } from "./SdCallMetadata";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { SdArrayMetadata } from "./SdArrayMetadata";
import { SdObjectMetadata } from "./SdObjectMetadata";
import { SdFunctionMetadata } from "./SdFunctionMetadata";


export class SdClassMetadata {
  public constructor(public collector: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public name: string,
                     public metadata: ClassMetadata) {
  }

  public getCallDecorators(): SdCallMetadata[] | undefined {
    if (!this.metadata.decorators) return undefined;
    const decorators = this.collector.getSdMetadata(this.module, this.metadata.decorators);
    if (!(decorators instanceof SdArrayMetadata)) throw new NeverEntryError();

    return decorators
      .getArray()
      .map((item) => {
        if (!(item instanceof SdCallMetadata)) return undefined;
        return item;
      })
      .filterExists();
  }

  public getFuncDecorators(): SdFunctionMetadata[] | undefined {
    if (!this.metadata.decorators) return undefined;
    const decorators = this.collector.getSdMetadata(this.module, this.metadata.decorators);
    if (!(decorators instanceof SdArrayMetadata)) throw new NeverEntryError();

    return decorators
      .getArray()
      .map((item) => {
        if (!(item instanceof SdFunctionMetadata)) return undefined;
        return item;
      })
      .filterExists();
  }

  public getStaticsObj(): SdObjectMetadata | undefined {
    if (!this.metadata.statics) return undefined;

    const staticObj = this.collector.getSdMetadata(this.module, this.metadata.statics);
    if (!(staticObj instanceof SdObjectMetadata)) throw new NeverEntryError();

    return staticObj;
  }
}