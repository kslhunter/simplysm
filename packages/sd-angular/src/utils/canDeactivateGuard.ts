import {CanDeactivateFn} from "@angular/router";

export const canDeactivateGuard: CanDeactivateFn<{ canDeactivate?: () => boolean }> = (component: {
  canDeactivate?: () => boolean
}) => {
  return component.canDeactivate ? component.canDeactivate() : true;
};
