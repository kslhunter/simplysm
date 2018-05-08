import {Injectable} from "@angular/core";
import {CanDeactivate} from "@angular/router";
import {ISdCanDeactivatePageBase} from "../bases/ISdCanDeactivatePageBase";

@Injectable()
export class SdCanDeactivateGuardProvider implements CanDeactivate<ISdCanDeactivatePageBase> {
  public async canDeactivate(component?: ISdCanDeactivatePageBase): Promise<boolean> {
    return component && component.canDeactivate
      ? await component.canDeactivate()
      : true;
  }
}
