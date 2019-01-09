import {SdStyleVariables} from "./SdStyleVariables";
import {SdStyleMixins} from "./SdStyleMixins";
import {SdStyleFunctions} from "..";

export class SdStylePresets {
  private readonly _vars = new SdStyleVariables();
  public get vars(): SdStyleVariables {
    return this._vars;
  }

  private readonly _mixins = new SdStyleMixins(this._vars);
  public get mixins(): SdStyleMixins {
    return this._mixins;
  }

  private readonly _fns = new SdStyleFunctions();
  public get fns(): SdStyleFunctions {
    return this._fns;
  }
}
