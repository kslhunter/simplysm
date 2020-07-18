import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdSystemConfigRootProvider {
  public fn?: {
    set: (key: string, data: any) => Promise<void> | void;
    get: (key: string) => Promise<any> | any;
  };

  public async setAsync(key: string, data: any): Promise<void> {
    if (this.fn) {
      await this.fn.set(key, data);
    }
  }

  public async getAsync(key: string): Promise<any> {
    if (this.fn) {
      return await this.fn.get(key);
    }
    return undefined;
  }
}