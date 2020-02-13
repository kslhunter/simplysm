import {MetadataArray, MetadataEntry, MetadataObject} from "@angular/compiler-cli";
import {SdModuleMetadata} from "./SdModuleMetadata";

export abstract class SdMetadataBase {
  public abstract module: SdModuleMetadata;
}

export function isMetadataObjectExpression(metadata: MetadataEntry): metadata is MetadataObject {
  return metadata != undefined &&
    !metadata["__symbolic"] &&
    !(metadata instanceof Array) &&
    typeof metadata === "object";
}

export function isMetadataArrayExpression(metadata: MetadataEntry): metadata is MetadataArray & MetadataEntry[] {
  return metadata != undefined && metadata instanceof Array;
}

export type TSdMetadata = SdMetadataBase | string | number | boolean | undefined;