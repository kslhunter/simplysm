import {JsonConvert} from "@simplysm/sd-core-common";
import {Injectable} from "@angular/core";

@Injectable({providedIn: "root"})
export class SdLocalStorageProvider {
  prefix = "simplysm";

  set(key: string, value: any) {
    localStorage.setItem(`${this.prefix}.${key}`, JsonConvert.stringify(value));
  }

  get(key: string): any {
    const json = localStorage.getItem(`${this.prefix}.${key}`);
    if (json == null) return undefined;
    return JsonConvert.parse(json);
  }

  remove(key: string) {
    localStorage.removeItem(`${this.prefix}.${key}`);
  }
}
