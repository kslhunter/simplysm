import {ChangeDetectionStrategy, Component, ContentChildren, forwardRef, Injector, QueryList} from "@angular/core";
import {SdSidebarContainerControl} from "../sidebar/SdSidebarContainerControl";
import {SdTopbarMenuControl} from "./SdTopbarMenuControl";

@Component({
  selector: "sd-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a (click)="toggleSidebar()" style="font-size: 16px;"
       *ngIf="!!sidebarContainerControl && !isSidebarContainerHidden">
      <sd-icon [icon]="'bars'" [fw]="true"></sd-icon>
    </a>
    <div *ngIf="!sidebarContainerControl || !!isSidebarContainerHidden"
         style="display: inline-block;"
         class="sd-padding-left-lg"></div>
    <ng-content></ng-content>`
})
export class SdTopbarControl {
  @ContentChildren(forwardRef(() => SdTopbarMenuControl), {descendants: true})
  public topbarMenuControls?: QueryList<SdTopbarMenuControl>;

  public get sidebarContainerControl(): SdSidebarContainerControl | undefined {
    const control = this._injector.get<SdSidebarContainerControl | null>(SdSidebarContainerControl, null); //tslint:disable-line:no-null-keyword
    if (control === null) {
      return undefined;
    }
    else {
      return control;
    }
  }

  public get isSidebarContainerHidden(): boolean {
    return !!this.sidebarContainerControl && this.sidebarContainerControl.hidden;
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
