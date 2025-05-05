import { JsonConvert } from "@simplysm/sd-core-common";
import { inject, Injectable } from "@angular/core";
import { SdAngularConfigProvider } from "./sd-angular-config.provider";

export function injectSdLocalStorage<T>(): SdLocalStorageProvider<T> {
  return inject(SdLocalStorageProvider);
}

@Injectable({ providedIn: "root" })
export class SdLocalStorageProvider<T> {
  private _sdNgConf = inject(SdAngularConfigProvider);

  set<K extends keyof T & string>(key: K, value: T[K]) {
    localStorage.setItem(`${this._sdNgConf.clientName}.${key}`, JsonConvert.stringify(value));
  }

  get(key: keyof T & string) {
    const json = localStorage.getItem(`${this._sdNgConf.clientName}.${key}`);
    if (json == null) return undefined;
    return JsonConvert.parse(json);
  }

  remove(key: keyof T & string) {
    localStorage.removeItem(`${this._sdNgConf.clientName}.${key}`);
  }
}
