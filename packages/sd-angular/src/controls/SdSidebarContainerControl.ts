import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding } from "@angular/core";
import { NavigationStart, Router } from "@angular/router";

@Component({
  selector: "sd-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";

    :host {
      @include container-base();
      padding-left: var(--sd-sidebar-width);
      transition: padding-left .1s ease-out;

      &[sd-toggle=true] {
        padding-left: 0;
        transition: padding-left .1s ease-in;
      }
    }
  `]
})
export class SdSidebarContainerControl {
  @HostBinding("attr.sd-toggle")
  public toggle = false;

  public constructor(private readonly _cdr: ChangeDetectorRef,
                     private readonly _router: Router) {
    this._router.events.subscribe((value) => {
      if (value instanceof NavigationStart) {
        this.toggle = false;
        this._cdr.markForCheck();
      }
    });
  }
}