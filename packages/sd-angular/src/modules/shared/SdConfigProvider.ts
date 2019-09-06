import {Injectable} from "@angular/core";
import {SdLocalStorageProvider} from "./SdLocalStorageProvider";

@Injectable()
export class SdConfigProvider {
  private _setFn?: (key: string, data: any) => Promise<void>;
  private _getFn?: (key: string) => Promise<any>;

  public constructor(private readonly _localStorage: SdLocalStorageProvider) {
  }

  public initialize(setFn?: (key: string, data: any) => Promise<void>, getFn?: (key: string) => Promise<any>): void {
    this._setFn = setFn;
    this._getFn = getFn;
  }

  public async set(key: string, data: any): Promise<void> {
    if (this._setFn) {
      try {
        await this._setFn(key, data);
        this._localStorage.remove(key);
      }
      catch {
        this._localStorage.set(key, data);
      }
    }
    else {
      this._localStorage.set(key, data);
    }
  }

  public async get(key: string): Promise<any> {
    if (this._setFn && this._localStorage.get(key)) {
      const data = this._localStorage.get(key);
      await this.set(key, data);
      return data;
    }

    if (this._getFn) {
      return this._getFn(key);
    }
    else {
      return this._localStorage.get(key);
    }
  }
}