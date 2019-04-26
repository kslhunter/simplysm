import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-sidebar-brand",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
  `
})
export class SdSidebarBrandControl {}
