import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, Injector, Input} from "@angular/core";
import {NavigationStart, Router} from "@angular/router";

@Component({
  selector: "sd-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
    <div class="_backdrop" (click)="onBackdropClick()"></div>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      position: relative;
      height: 100%;
      padding-left: var(--sd-sidebar-width);
      transition: padding-left .1s ease-out;

      &[sd-desktop-toggle=true] {
        padding-left: 0;
        transition: padding-left .1s ease-in;
      }

      > ._backdrop {
        display: none;
      }
    }

    @media screen and (max-width: 520px) {
      :host {
        padding-left: 0;

        > ._backdrop {
          position: absolute;
          display: block;
          z-index: calc(var(--z-index-sidebar) - 1);
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: black;
          opacity: 0;
          pointer-events: none;
          transition: opacity .3s ease-in-out;
        }

        &[sd-desktop-toggle=true] {
          > ._backdrop {
            opacity: .6;
            pointer-events: auto;
          }
        }
      }
    }
  `]
})
export class SdSidebarContainerControl {
  @HostBinding("attr.sd-toggle")
  public toggle = false;

  @Input()
  @HostBinding("attr.sd-open-on-desktop")
  public openOnDesktop = true;

  @HostBinding("attr.sd-desktop-toggle")
  public get desktopToggle(): boolean {
    if (!this.openOnDesktop) {
      return !this.toggle;
    }
    else {
      return this.toggle;
    }
  }

  private readonly _router?: Router;

  public constructor(private readonly _cdr: ChangeDetectorRef,
                     private readonly _injector: Injector) {
    this._router = this._injector.get<Router | null>(Router, null) ?? undefined;

    this._router?.events.subscribe((value) => {
      if (value instanceof NavigationStart) {
        this.toggle = false;
        this._cdr.markForCheck();
      }
    });
  }

  public onBackdropClick(): void {
    this.toggle = !this.toggle;
  }
}
