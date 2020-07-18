import { MetadataArray, MetadataEntry, MetadataObject } from "@angular/compiler-cli";
import { SdModuleMetadata } from "./SdModuleMetadata";

export abstract class SdMetadataBase {
  public abstract module: SdModuleMetadata;
}

export const isMetadataObjectExpression = function (metadata: MetadataEntry): metadata is MetadataObject {
  return metadata != null &&
    metadata["__symbolic"] === undefined &&
    !(metadata instanceof Array) &&
    typeof metadata === "object";
};

export const isMetadataArrayExpression = function (metadata: MetadataEntry): metadata is MetadataArray & MetadataEntry[] {
  return metadata != null && metadata instanceof Array;
};

export type TSdMetadata = SdMetadataBase | string | number | boolean | undefined;