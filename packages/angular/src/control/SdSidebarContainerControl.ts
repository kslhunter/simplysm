import {ChangeDetectionStrategy, Component, HostBinding} from "@angular/core";
import {NavigationStart, Router} from "@angular/router";

@Component({
  selector: "sd-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
    <div class="_backdrop" (click)="toggle = false"></div>`,
  styles: [/* language=SCSS*/ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      padding-left: 200px;
      transition: padding-left .1s ease-out;

      /deep/ > sd-sidebar {
        transition: transform .1s ease-out;
      }

      > ._backdrop {
        display: none;
      }

      &[sd-toggle=true] {
        padding-left: 0;
        transition: padding-left .1s ease-in;

        /deep/ > sd-sidebar {
          transform: translateX(-100%);
          transition: transform .1s ease-in;
        }
      }

      @media #{$screen-mobile} {
        padding-left: 0;
        transition: none;

        /deep/ > sd-sidebar {
          transform: translateX(-100%);
          transition: transform .1s ease-in;
        }

        &[sd-toggle=true] {
          /deep/ > sd-sidebar {
            transform: none;
            transition: transform .1s ease-out;
          }

          > ._backdrop {
            display: block;
            position: absolute;
            z-index: $z-index-sidebar - 1;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, .6);
          }
        }
      }
    }
  `]
})
export class SdSidebarContainerControl {
  @HostBinding("attr.sd-toggle")
  public toggle = false;

  public constructor(private readonly _router: Router) {
    this._router.events.subscribe(value => {
      if (value instanceof NavigationStart) {
        this.toggle = false;
      }
    });
  }
}