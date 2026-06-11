import { inject, Injectable, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { SdAngularConfigProvider } from "./sd-angular-config.provider";

@Injectable({ providedIn: "root" })
export class SdLocalStorageProvider<T> {
  private readonly _sdAngularConfig = inject(SdAngularConfigProvider);

  /** SSR(프리렌더) 가드: 서버에는 localStorage가 없음 — set/remove는 무동작, get은 "값 없음" */
  private readonly _isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  set<K extends keyof T & string>(key: K, value: T[K]) {
    if (!this._isBrowser) return;
    localStorage.setItem(`${this._sdAngularConfig.clientName}.${key}`, JSON.stringify(value));
  }

  get<K extends keyof T & string>(key: K): T[K] | undefined {
    if (!this._isBrowser) return undefined;
    const json = localStorage.getItem(`${this._sdAngularConfig.clientName}.${key}`);
    if (json == null) return undefined;
    try {
      return JSON.parse(json);
    } catch {
      return undefined;
    }
  }

  remove(key: keyof T & string) {
    if (!this._isBrowser) return;
    localStorage.removeItem(`${this._sdAngularConfig.clientName}.${key}`);
  }
}
