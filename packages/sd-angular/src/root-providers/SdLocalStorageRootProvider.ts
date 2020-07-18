import { JsonConvert } from "@simplysm/sd-core-common";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdLocalStorageRootProvider {
  public prefix = "simplysm";

  public set(key: string, value: any): void {
    localStorage.setItem(`${this.prefix}.${key}`, JsonConvert.stringify(value) ?? "");
  }

  public get(key: string): any {
    const json = localStorage.getItem(`${this.prefix}.${key}`);
    if (json == null) return undefined;
    return JsonConvert.parse(json);
  }

  public remove(key: string): void {
    localStorage.removeItem(`${this.prefix}.${key}`);
  }
}
