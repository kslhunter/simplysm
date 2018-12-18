import {ChangeDetectionStrategy, Component} from "@angular/core";


@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdTopbarMenuControl {


}