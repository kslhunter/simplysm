import {SdStylePreset} from "./SdStylePreset";

export class SdStyleMixins {
  public constructor(private readonly _preset: SdStylePreset) {
  }

  public formControlBase(): { [key: string]: string } {
    return {
      "display": "block",
      "width": "100%",
      "font-size": this._preset.v.fontSize.default,
      "font-family": this._preset.v.fontFamily,
      "line-height": this._preset.v.lineHeight,
      "color": this._preset.v.textColor.default,
      "padding": `${this._preset.v.gap.sm} ${this._preset.v.gap.default}`,

      "border": "1px solid transparent",
      "user-select": "none"
    };
  }

  public elevation(depth: number): { [key: string]: string } {
    return {
      "box-shadow": `0 0 ${depth}/2px ${this._preset.v.transColor.dark}, 0 ${depth}/2px ${depth}px ${this._preset.v.transColor.darker}`
    };
  }
}
