import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-sidebar-user-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
  `
})
export class SdSidebarUserMenuControl {}
