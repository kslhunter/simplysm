import {Injectable} from "@angular/core";
import {SdStyleFunction} from "../commons/style/commons";
import {SdStylePreset} from "../commons/style/SdStylePreset";
import * as less from "less";

@Injectable()
export class SdStyleProvider {
  private readonly _styleFns: { [key: string]: SdStyleFunction } = {};
  public preset: SdStylePreset = new SdStylePreset();

  public async initAsync(): Promise<void> {
    await Promise.all(Object.keys(this._styleFns).map(async key => {
      await this._loadAsync(key);
    }));
  }

  public addStyles(key: string, fn: SdStyleFunction): void {
    this._styleFns[key] = fn;
  }

  public async addStylesAsync(key: string, fn: SdStyleFunction, reload?: boolean): Promise<void> {
    this.addStyles(key, fn);
    if (reload) {
      await this._loadAsync(key);
    }
  }

  private async _loadAsync(key: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const prevStyle = document.getElementById("SdStyleProvider_" + key);
      if (prevStyle) {
        prevStyle.remove();
      }

      const styleEl = document.createElement("style");
      styleEl.setAttribute("id", "SdStyleProvider_" + key);
      document.head!.appendChild(styleEl);

      less.render(
        styleEl.innerHTML = this._styleFns[key](this.preset),
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
