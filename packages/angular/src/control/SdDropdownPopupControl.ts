import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdDropdownPopupControl {
}