import { Injectable } from "@angular/core";
import { SdSharedDataProvider, type ISharedDataBase } from "../../../src/core/providers/sd-shared-data.provider";

export interface ITestUser extends ISharedDataBase<number> {
  __valueKey: number;
  name: string;
  sortOrder: number;
}

@Injectable()
export class TestSharedDataProvider extends SdSharedDataProvider<{ users: ITestUser }> {
  override initialize(): void {
    // Tests will call register() directly
  }
}
