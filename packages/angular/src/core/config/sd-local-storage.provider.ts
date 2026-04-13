import { inject, Injectable } from "@angular/core";
import { SdAngularConfigProvider } from "./sd-angular-config.provider";

@Injectable({ providedIn: "root" })
export class SdLocalStorageProvider<T> {
  private readonly _sdAngularConfig = inject(SdAngularConfigProvider);

  set<K extends keyof T & string>(key: K, value: T[K]) {
    localStorage.setItem(`${this._sdAngularConfig.clientName}.${key}`, JSON.stringify(value));
  }

  get<K extends keyof T & string>(key: K): T[K] | undefined {
    const json = localStorage.getItem(`${this._sdAngularConfig.clientName}.${key}`);
    if (json == null) return undefined;
    try {
      return JSON.parse(json);
    } catch {
      return undefined;
    }
  }

  remove(key: keyof T & string) {
    localStorage.removeItem(`${this._sdAngularConfig.clientName}.${key}`);
  }
}
