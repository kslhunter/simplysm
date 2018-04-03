import {Injectable} from "@angular/core";
import {CanDeactivate} from "@angular/router";
import {SdCanDeactivatePage} from "../bases/SdCanDeactivatePage";

@Injectable()
export class SdCanDeactivateGuardProvider implements CanDeactivate<SdCanDeactivatePage> {
    async canDeactivate(component: SdCanDeactivatePage): Promise<boolean> {
        return component.canDeactivate
            ? await component.canDeactivate()
            : true;
    }
}