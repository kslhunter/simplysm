import {Injectable} from "@angular/core";
import {CanDeactivate} from "@angular/router";
import {SdCanDeactivatePage} from "../bases/SdCanDeactivatePage";

@Injectable()
export class SdCanDeactivateGuardProvider implements CanDeactivate<SdCanDeactivatePage> {
    public async canDeactivate(component?: SdCanDeactivatePage): Promise<boolean> {
        return component && component.canDeactivate
            ? await component.canDeactivate()
            : true;
    }
}