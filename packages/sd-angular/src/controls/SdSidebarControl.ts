import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "sd-sidebar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <sd-dock-container>
      <sd-dock class="_brand">
        <ng-content select="sd-sidebar-brand"></ng-content>
      </sd-dock>
      <sd-dock class="_user">
        <ng-content select="sd-sidebar-user"></ng-content>
      </sd-dock>
      <sd-pane>
        <ng-content></ng-content>
      </sd-pane>
    </sd-dock-container>
  `
})
export class SdSidebarControl {}
