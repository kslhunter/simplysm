import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, Injector } from "@angular/core";
import { NavigationStart, Router } from "@angular/router";

@Component({
  selector: "sdm-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
    <div class="_backdrop" (click)="onBackdropClick()"></div>`,
  styles: [/* language=SCSS */ `
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;

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
        transition: opacity .3s ease-in-out;
        pointer-events: none;
      }

      &[sd-toggle=true] {
        > ._backdrop {
          opacity: .6;
          pointer-events: auto;
        }
      }
    }
  `]
})
export class SdmSidebarContainerControl {
  @HostBinding("attr.sd-toggle")
  public toggle = false;

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
