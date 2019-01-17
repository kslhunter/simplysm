import {SdStylePreset} from "./SdStylePreset";

export type SdStyleFunction = (s: SdStylePreset) => string;

export interface ISdStyleObject {
  [key: string]: string;
}
