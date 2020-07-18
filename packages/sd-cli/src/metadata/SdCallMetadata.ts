import {
  isMetadataGlobalReferenceExpression,
  isMetadataImportedSymbolReferenceExpression,
  MetadataArray,
  MetadataSymbolicCallExpression
} from "@angular/compiler-cli";
import { NeverEntryError } from "@simplysm/sd-core-common";
import { SdMetadataCollector } from "./SdMetadataCollector";
import { isMetadataArrayExpression, SdMetadataBase, TSdMetadata } from "./commons";
import { SdModuleMetadata } from "./SdModuleMetadata";


export class SdCallMetadata extends SdMetadataBase {
  public get expression(): { module: string; name: string } {
    if (isMetadataImportedSymbolReferenceExpression(this.metadata.expression)) {
      return {
        module: this.metadata.expression.module,
        name: this.metadata.expression.name
      };
    }
    else if (isMetadataGlobalReferenceExpression(this.metadata.expression)) {
      return {
        module: this.module.name,
        name: this.metadata.expression.name
      };
    }
    else {
      throw new NeverEntryError();
    }
  }

  public get arguments(): TSdMetadata[] {
    const metadata = this.metadata.arguments ?? [] as MetadataArray;

    const real = this.pkg.findRealMetadata(this.module, metadata);
    if (!real) return [];

    if (!isMetadataArrayExpression(real.metadata)) throw new NeverEntryError();
    return this.pkg.getSdMetadataArray(real.module, real.metadata);
  }

  public constructor(public readonly pkg: SdMetadataCollector,
                     public readonly module: SdModuleMetadata,
                     public readonly metadata: MetadataSymbolicCallExpression) {
    super();
  }
}