import {SdStylePreset} from "./SdStylePreset";

export class SdStyleFunctions {
  // @ts-ignore
  public constructor(private readonly _preset: SdStylePreset) {
  }

  public stripUnit(str: string): number {
    return Number(str.replace(/[^0-9.]/g, ""));
  }
}
