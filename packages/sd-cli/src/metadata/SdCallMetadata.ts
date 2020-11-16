import { SdMetadataCollector } from "./SdMetadataCollector";
import { SdModuleMetadata } from "./SdModuleMetadata";
import {
  isMetadataGlobalReferenceExpression,
  isMetadataImportedSymbolReferenceExpression,
  MetadataSymbolicCallExpression
} from "@angular/compiler-cli";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { SdArrayMetadata } from "./SdArrayMetadata";

export class SdCallMetadata {
  public constructor(public collector: SdMetadataCollector,
                     public module: SdModuleMetadata,
                     public metadata: MetadataSymbolicCallExpression) {
  }

  public getExpression(): { moduleName: string; name: string } {
    if (isMetadataImportedSymbolReferenceExpression(this.metadata.expression)) {
      return {
        moduleName: this.metadata.expression.module,
        name: this.metadata.expression.name
      };
    }
    else if (isMetadataGlobalReferenceExpression(this.metadata.expression)) {
      return {
        moduleName: this.module.name,
        name: this.metadata.expression.name
      };
    }
    else {
      throw new NeverEntryError();
    }
  }

  public getArguments(): SdArrayMetadata | undefined {
    if (this.metadata.arguments === undefined) return undefined;

    const argumentsSdMetadata = this.collector.getSdMetadata(this.module, this.metadata.arguments);
    if (!(argumentsSdMetadata instanceof SdArrayMetadata)) throw new NeverEntryError();
    return argumentsSdMetadata;
  }
}