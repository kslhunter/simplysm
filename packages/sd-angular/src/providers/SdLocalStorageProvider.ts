import {JsonConvert} from "@simplysm/sd-core-common";
import {inject, Injectable} from "@angular/core";
import {SdAngularOptionsProvider} from "./SdAngularOptionsProvider";

@Injectable({providedIn: "root"})
export class SdLocalStorageProvider {
  #sdOptions = inject(SdAngularOptionsProvider);

  set(key: string, value: any) {
    localStorage.setItem(`${this.#sdOptions.clientName}.${key}`, JsonConvert.stringify(value));
  }

  get(key: string) {
    const json = localStorage.getItem(`${this.#sdOptions.clientName}.${key}`);
    if (json == null) return undefined;
    return JsonConvert.parse(json);
  }

  remove(key: string) {
    localStorage.removeItem(`${this.#sdOptions.clientName}.${key}`);
  }
}
