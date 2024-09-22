import { JsonConvert } from "@simplysm/sd-core-common";
import { inject, Injectable } from "@angular/core";
import { SdAngularConfigProvider } from "./SdAngularConfigProvider";

export function injectSdLocalStorage<T>(): SdLocalStorageProvider<T> {
  return inject(SdLocalStorageProvider);
}

@Injectable({ providedIn: "root" })
export class SdLocalStorageProvider<T> {
  #sdNgConf = inject(SdAngularConfigProvider);

  set<K extends keyof T & string>(key: K, value: T[K]) {
    localStorage.setItem(`${this.#sdNgConf.clientName}.${key}`, JsonConvert.stringify(value));
  }

  get(key: keyof T & string) {
    const json = localStorage.getItem(`${this.#sdNgConf.clientName}.${key}`);
    if (json == null) return undefined;
    return JsonConvert.parse(json);
  }

  remove(key: keyof T & string) {
    localStorage.removeItem(`${this.#sdNgConf.clientName}.${key}`);
  }
}
