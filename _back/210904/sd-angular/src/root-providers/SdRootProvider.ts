import { ApplicationRef, Injectable, Injector, Type } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdRootProvider {
  public data: Record<string, any> = {};

  public constructor(private readonly _injector: Injector,
                     public readonly appRef: ApplicationRef) {
  }

  public get<T>(injectable: Type<T>): T {
    return this._injector.get<T>(injectable);
  }
}
