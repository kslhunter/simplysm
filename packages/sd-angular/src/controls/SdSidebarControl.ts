import {ChangeDetectionStrategy, Component, HostBinding} from "@angular/core";
import {SdDockContainerControl, SdDockControl} from "./SdDockControl";

@Component({
  selector: "sd-sidebar",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdDockControl, useExisting: SdSidebarControl}]
})
export class SdSidebarControl extends SdDockControl {
  public constructor() {
    super();
    this.position = "left";
    this.width = 280;
  }
}

@Component({
  selector: "sd-sidebar-container",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdDockContainerControl, useExisting: SdSidebarContainerControl}]
})
export class SdSidebarContainerControl extends SdDockContainerControl {
  @HostBinding("attr.sd-toggled")
  public toggled?: boolean;

  @HostBinding("ngIf")
  public get ngIf(): boolean {
    return !this.toggled;
  }
}