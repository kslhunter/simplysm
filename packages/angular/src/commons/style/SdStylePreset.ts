import {SdStyleVariables} from "./SdStyleVariables";
import {SdStyleMixins} from "./SdStyleMixins";
import {SdStyleFunctions} from "./SdStyleFunctions";

export class SdStylePreset {
  public v = new SdStyleVariables();
  public m = new SdStyleMixins(this);
  public f = new SdStyleFunctions(this);
}
