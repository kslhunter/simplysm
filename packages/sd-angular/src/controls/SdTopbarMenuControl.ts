import {ChangeDetectionStrategy, Component} from "@angular/core";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_icon">
      <ng-content select="sd-icon"></ng-content>
    </div>
    <div class="_content">
      <ng-content></ng-content>
    </div>`
})
export class SdTopbarMenuControl {
}
