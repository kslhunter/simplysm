import {Injectable} from "@angular/core";
import {JsonConvert} from "@simplysm/sd-common";

@Injectable()
export class SdLocalStorageProvider {
  public prefix = "sd";

  public set(key: string, value: any): void {
    localStorage.setItem(`${this.prefix}.${key}`, JsonConvert.stringify(value) || "");
  }

  public get(key: string): any {
    const json = localStorage.getItem(`${this.prefix}.${key}`);
    if (!json) return undefined;
    return JsonConvert.parse(json);
  }

  public remove(key: string): void {
    localStorage.removeItem(`${this.prefix}.${key}`);
  }
}
