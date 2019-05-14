import {ChangeDetectionStrategy, Component, Injector} from "@angular/core";
import {SdSidebarContainerControl} from "./SdSidebarContainerControl";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a (click)="toggleSidebar()" style="font-size: 16px;" *ngIf="!!sidebarContainerControl">
      <sd-icon [icon]="'bars'" [fw]="true"></sd-icon>
    </a>
    <div *ngIf="!sidebarContainerControl" style="display: inline-block; width: 12px;"></div>
    <ng-content></ng-content>`
})
export class SdTopbarControl {
  public get sidebarContainerControl(): SdSidebarContainerControl | undefined {
    return this._injector.get<SdSidebarContainerControl | undefined>(SdSidebarContainerControl, undefined);
  }

  public constructor(private readonly _injector: Injector) {
  }

  public toggleSidebar(): void {
    const sidebarControl = this.sidebarContainerControl;
    if (!!sidebarControl) {
      sidebarControl.toggle = !sidebarControl.toggle;
    }
  }
}
