import { inject, Injectable } from "@angular/core";
import { SdLocalStorageProvider } from "./SdLocalStorageProvider";

@Injectable({ providedIn: "root" })
export class SdSystemConfigProvider<T> {
  #sdLocalStorage = inject<SdLocalStorageProvider<T>>(SdLocalStorageProvider);

  fn?: {
    set<K extends keyof T & string>(key: K, data: T[K]): Promise<void> | void;
    get(key: keyof T & string): PromiseLike<any>;
  };

  async setAsync<K extends keyof T & string>(key: K, data: T[K]) {
    if (this.fn) {
      await this.fn.set(key, data);
    } else {
      this.#sdLocalStorage.set(key, data);
    }
  }

  async getAsync(key: keyof T & string) {
    if (this.fn) {
      return await this.fn.get(key);
    } else {
      return this.#sdLocalStorage.get(key);
    }
  }
}
