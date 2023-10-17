import {CanDeactivateFn} from "@angular/router";

export const sdCanDeactivateGuard: CanDeactivateFn<SdCanDeactivate> = (component) => {
  return component.sdCanDeactivate ? component.sdCanDeactivate() : true;
};

export interface SdCanDeactivate {
  sdCanDeactivate: (() => boolean) | undefined;
}