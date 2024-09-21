import {JsonConvert} from "@simplysm/sd-core-common";
import {inject, Injectable} from "@angular/core";
import {SdAngularConfigProvider} from "./SdAngularConfigProvider";

@Injectable({providedIn: "root"})
export class SdLocalStorageProvider {
  #sdNgConf = inject(SdAngularConfigProvider);

  set(key: string, value: any) {
    localStorage.setItem(`${this.#sdNgConf.clientName}.${key}`, JsonConvert.stringify(value));
  }

  get(key: string) {
    const json = localStorage.getItem(`${this.#sdNgConf.clientName}.${key}`);
    if (json == null) return undefined;
    return JsonConvert.parse(json);
  }

  remove(key: string) {
    localStorage.removeItem(`${this.#sdNgConf.clientName}.${key}`);
  }
}
