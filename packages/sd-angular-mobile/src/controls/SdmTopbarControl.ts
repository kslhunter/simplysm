import {
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  ElementRef,
  forwardRef,
  Inject,
  Injector,
  Input
} from "@angular/core";
import { SdmTopbarContainerControl } from "./SdmTopbarContainerControl";
import { SdmSidebarContainerControl } from "./SdmSidebarContainerControl";
import { SdInputValidate } from "@simplysm/sd-angular";

@Component({
  selector: "sdm-topbar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_nav">
      <ng-content select="sdm-topbar-nav"></ng-content>
    </div>
    <div class="_sidebar-toggle-button" (click)="onSidebarToggleButtonClick()"
         *ngIf="sidebarContainerControl && !hideSidebarToggleButton">
      <fa-icon [icon]="icons.fadBars | async" [fixedWidth]="true"></fa-icon>
    </div>
    <div class="_content">
      <ng-content></ng-content>
    </div>
    <div class="_menu">
      <ng-content select="sdm-topbar-menu, sd-dropdown"></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      display: block;
      position: absolute;
      top: 0;
      width: 100%;
      height: var(--sd-topbar-height);

      color: var(--text-brightness-light);

      background: var(--sd-background-color);

      > ._nav {
        display: inline-block;
        height: var(--sd-topbar-height);
        white-space: nowrap;
        vertical-align: top;
      }

      > ._content {
        display: inline-block;
        padding-left: calc((var(--sd-topbar-height) - var(--line-height)) / 2);
        height: var(--sd-topbar-height);

        &::ng-deep > * {
          line-height: var(--sd-topbar-height);
        }
      }

      > ._menu {
        float: right;
        white-space: nowrap;
      }

      > ._sidebar-toggle-button {
        display: inline-block;
        line-height: var(--sd-topbar-height);
        width: var(--sd-topbar-height);
        padding: 0 var(--gap-default);
        text-align: center;
        color: var(--text-brightness-lighter);

        @include mobile-active-effect(true);

        + ._content {
          padding: 0;
        }
      }
    }
  `]
})
export class SdmTopbarControl implements DoCheck {
  public icons = {
    fadBars: import("@fortawesome/pro-duotone-svg-icons/faBars").then(m => m.faBars)
  };

  public readonly sidebarContainerControl?: SdmSidebarContainerControl;

  @Input()
  @SdInputValidate(Boolean)
  public hideSidebarToggleButton?: boolean;

  public constructor(@Inject(forwardRef(() => SdmTopbarContainerControl))
                     private readonly _topbarContainerControl: SdmTopbarContainerControl,
                     private readonly _injector: Injector,
                     private readonly _elRef: ElementRef) {
    this.sidebarContainerControl = this._injector.get<SdmSidebarContainerControl | null>(SdmSidebarContainerControl, null) ?? undefined;
  }

  public onSidebarToggleButtonClick(): void {
    this.sidebarContainerControl!.toggle = !this.sidebarContainerControl!.toggle;
  }

  public ngDoCheck(): void {
    this._topbarContainerControl.paddingTopPx = this._elRef.nativeElement.offsetHeight;
  }
}
