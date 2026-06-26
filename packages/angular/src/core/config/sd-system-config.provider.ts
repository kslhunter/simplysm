import { inject, Injectable } from "@angular/core";
import { SdLocalStorageProvider } from "./sd-local-storage.provider";

@Injectable({ providedIn: "root" })
export class SdSystemConfigProvider<T> {
  private readonly _sdLocalStorage = inject<SdLocalStorageProvider<T>>(SdLocalStorageProvider);

  fn?: {
    set<K extends keyof T & string>(key: K, data: T[K] | undefined): Promise<void> | void;
    get(key: keyof T & string): PromiseLike<unknown>;
  };

  async setAsync<K extends keyof T & string>(key: K, data: T[K] | undefined) {
    if (this.fn) {
      await this.fn.set(key, data);
    } else if (data == null) {
      this._sdLocalStorage.remove(key);
    } else {
      this._sdLocalStorage.set(key, data);
    }
  }

  async getAsync<K extends keyof T & string>(key: K): Promise<T[K] | undefined> {
    if (this.fn) {
      return (await this.fn.get(key)) as T[K] | undefined;
    } else {
      return this._sdLocalStorage.get(key);
    }
  }
}
