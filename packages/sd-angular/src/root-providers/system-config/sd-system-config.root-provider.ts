import { Injectable } from "@angular/core";
import { SdLocalStorageRootProvider } from "../local-storage";

@Injectable({ providedIn: "root" })
export class SdSystemConfigRootProvider {
  public constructor(private readonly _localStorage: SdLocalStorageRootProvider) {
  }

  public fn?: {
    set: (key: string, data: any) => Promise<void> | void;
    get: (key: string) => PromiseLike<any>;
  };

  public async setAsync(key: string, data: any): Promise<void> {
    if (this.fn) {
      await this.fn.set(key, data);
    }
    else {
      this._localStorage.set(key, data);
    }
  }

  public async getAsync(key: string): Promise<any> {
    if (this.fn) {
      return await this.fn.get(key);
    }
    else {
      return this._localStorage.get(key);
    }
  }
}
