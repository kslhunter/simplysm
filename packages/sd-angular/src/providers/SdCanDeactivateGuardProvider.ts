import {Injectable} from "@angular/core";
import {CanDeactivate} from "@angular/router";
import {ISdCanDeactivatePage} from "../bases/ISdCanDeactivatePage";

@Injectable()
export class SdCanDeactivateGuardProvider implements CanDeactivate<ISdCanDeactivatePage> {
  public async canDeactivate(component?: ISdCanDeactivatePage): Promise<boolean> {
    return component && component.canDeactivate
      ? await component.canDeactivate()
      : true;
  }
}
