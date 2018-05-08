import {ChangeDetectionStrategy, Component, EventEmitter, Inject, Input, Optional, Output} from "@angular/core";
import {SdSidebarContainerControl} from "./SdSidebarControl";
import {SdTypeValidate} from "../commons/SdTypeValidate";
import {SdDockContainerControl, SdDockControl} from "./SdDockControl";

@Component({
  selector: "sd-topbar-container",
  template: `
    <ng-content></ng-content>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdDockContainerControl, useExisting: SdTopbarContainerControl}]
})
export class SdTopbarContainerControl extends SdDockContainerControl {
}

@Component({
  selector: "sd-topbar",
  template: `
    <a class="_sidebar-toggle-button"
       *ngIf="showSidebarToggleButton"
       (click)="onClickToggleButton()">
      <sd-icon icon="bars"></sd-icon>
    </a>
    <a class="_close-button"
       *ngIf="showCloseButton"
       (click)="onCloseButtonClick()">
      <sd-icon icon="times"></sd-icon>
    </a>
    <div>
      <ng-content></ng-content>
    </div>
    <div>
      <ng-content select="sd-list"></ng-content>
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{provide: SdDockControl, useExisting: SdTopbarControl}]
})
export class SdTopbarControl extends SdDockControl {
  @Input()
  @SdTypeValidate(Boolean)
  public showSidebarToggleButton?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public showCloseButton?: boolean;

  @Output()
  public readonly close = new EventEmitter<void>();

  public constructor(@Inject(SdSidebarContainerControl)
                     @Optional()
                     private readonly _parentSidebarContainerControl?: SdSidebarContainerControl) {
    super();
    this.top = 48;
  }

  public onClickToggleButton(): void {
    if (!this._parentSidebarContainerControl) return;
    this._parentSidebarContainerControl.toggled = !this._parentSidebarContainerControl.toggled;
  }

  public onCloseButtonClick(): void {
    this.close.emit();
  }
}
