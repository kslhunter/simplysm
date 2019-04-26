import { ChangeDetectionStrategy, Component, Injector } from "@angular/core";
import { SdSidebarContainerControl } from "./SdSidebarContainerControl";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a (click)="toggleSidebar()" style="font-size: 16px;">
      <sd-icon [icon]="'bars'" [fw]="true"></sd-icon>
    </a>
    <ng-content></ng-content>
  `
})
export class SdTopbarControl {
  public constructor(private readonly _injector: Injector) {}

  public toggleSidebar(): void {
    const sidebarControl = this._injector.get<{ toggle: boolean }>(SdSidebarContainerControl, { toggle: false });
    sidebarControl.toggle = !sidebarControl.toggle;
  }
}
