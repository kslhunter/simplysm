import { Injectable } from "@angular/core";
import { SdSharedDataProvider, type ISharedDataBase } from "../../../src/core/providers/sd-shared-data.provider";

export interface ITestUser extends ISharedDataBase<number> {
  __valueKey: number;
  __searchText: string;
  __isHidden: boolean;
  name: string;
  sortOrder: number;
}

export function testUser(key: number, name: string, sortOrder: number): ITestUser {
  return { __valueKey: key, __searchText: name, __isHidden: false, name, sortOrder };
}

@Injectable()
export class TestSharedDataProvider extends SdSharedDataProvider<{ users: ITestUser }> {
  override initialize(): void {
    // Tests will call register() directly
  }
}
