import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdSidebarControl {
}