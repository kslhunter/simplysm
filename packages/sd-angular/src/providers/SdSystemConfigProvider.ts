import {inject, Injectable} from "@angular/core";
import {SdLocalStorageProvider} from "./SdLocalStorageProvider";

@Injectable({providedIn: "root"})
export class SdSystemConfigProvider {
  #sdLocalStorage = inject(SdLocalStorageProvider);

  fn?: {
    set: (key: string, data: any) => Promise<void> | void;
    get: (key: string) => PromiseLike<any>;
  };

  async setAsync(key: string, data: any) {
    if (this.fn) {
      await this.fn.set(key, data);
    }
    else {
      this.#sdLocalStorage.set(key, data);
    }
  }

  async getAsync(key: string) {
    if (this.fn) {
      return await this.fn.get(key);
    }
    else {
      return this.#sdLocalStorage.get(key);
    }
  }
}
