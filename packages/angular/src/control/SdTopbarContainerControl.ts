import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-topbar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`
})
export class SdTopbarContainerControl {
}