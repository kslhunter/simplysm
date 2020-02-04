import {Injectable} from "@angular/core";
import {SdLocalStorageProvider} from "./SdLocalStorageProvider";

@Injectable()
export class SdSystemConfigProvider {
  public fn?: {
    set: (key: string, data: any) => Promise<void>;
    get: (key: string) => Promise<any>;
  };

  public constructor(private readonly _localStorage: SdLocalStorageProvider) {
  }

  public async set(key: string, data: any): Promise<void> {
    if (this.fn) {
      await this.fn!.set(key, data);
    }
    else {
      this._localStorage.set(`sd-system-config.${key}`, data);
    }
  }

  public async get(key: string): Promise<any> {
    if (this.fn && this._localStorage.get(key)) {
      const data = this._localStorage.get(key);
      await this.set(key, data);
      this._localStorage.remove(key);
      return data;
    }

    if (this.fn) {
      return this.fn.get(key);
    }
    else {
      return this._localStorage.get(`sd-system-config.${key}`);
    }
  }
}