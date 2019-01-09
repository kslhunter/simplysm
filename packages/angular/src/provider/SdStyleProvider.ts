import {Injectable} from "@angular/core";
import * as less from "less";
import {stylesDefaults} from "../styles/stylesDefault";
import {stylesClasses} from "../styles/stylesClasses";
import {stylesToast} from "../styles/stylesToast";
import {stylesControls} from "../styles/stylesControls";
import {SdStylePresets} from "../style/SdStylePresets";
import {SdStyleBuilder} from "../style/SdStyleBuilder";

export class SdStyleFunctions {
  public stripUnit(str: string): number {
    return Number(str.replace(/[^0-9.]/g, ""));
  }
}

@Injectable()
export class SdStyleProvider {
  private readonly _presets = new SdStylePresets();
  public get presets(): SdStylePresets {
    return this._presets;
  }

  private readonly _styleFns: { [key: string]: (s: SdStylePresets) => SdStyleBuilder } = {
    defaults: stylesDefaults,
    classes: stylesClasses,
    controls: stylesControls,
    toast: stylesToast
  };

  public async applyAsync(): Promise<void> {
    await Promise.all(Object.keys(this._styleFns).map(async key => {
      await this._applyOneAsync(key);
    }));
  }

  public async applyNewAsync(key: string, fn: () => SdStyleBuilder, reload?: boolean): Promise<void> {
    if (!reload && Object.keys(this._styleFns).includes(key)) {
      return;
    }

    this._styleFns[key] = fn;
    await this._applyOneAsync(key);
  }

  private async _applyOneAsync(key: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const prevStyle = document.getElementById("SdStyleProvider_" + key);
      if (prevStyle) {
        prevStyle.remove();
      }

      const styleEl = document.createElement("style");
      styleEl.setAttribute("id", "SdStyleProvider_" + key);
      document.head!.appendChild(styleEl);

      less.render(
        this._styleFns[key](this.presets).css,
        (err, out) => {
          if (err) {
            reject(err);
            return;
          }

          styleEl.innerHTML = out.css.replace(/[\r\n]/g, "").replace(/\s\s/g, " ");
          resolve();
        }
      );
    });
  }
}
