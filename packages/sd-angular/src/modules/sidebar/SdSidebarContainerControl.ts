import {ChangeDetectionStrategy, Component, HostBinding, ViewEncapsulation} from "@angular/core";
import {NavigationStart, Router} from "@angular/router";
import {SdWindowProvider} from "../window/SdWindowProvider";

@Component({
  selector: "sd-sidebar-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>
    <div class="_backdrop" (click)="toggle = !toggle"></div>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/_mixins";
    @import "../../../scss/_variables-scss";

    sd-sidebar-container {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      padding-left: var(--sidebar-width);
      transition: padding-left .1s ease-out;

      > sd-sidebar {
        transition: transform .1s ease-out;
        background: var(--theme-bluegrey-darkest);
        color: var(--text-reverse-color-default);

        a {
          color: var(--text-reverse-color-dark);

          &:hover,
          &:focus {
            color: var(--text-reverse-color-default);
          }
        }

        sd-list {
          background: var(--theme-bluegrey-darkest);
        }

        sd-list-item {
          > ._content > label {
            background: var(--theme-bluegrey-darkest);

            > ._angle-icon {
              color: var(--text-reverse-color-dark);
            }
          }

          &[sd-has-children=true] {
            > ._content {
              border-color: var(--theme-bluegrey-darkest);
            }
          }

          &[sd-clickable=true] {
            > ._content > label {
              &:hover {
                background: var(--trans-color-dark);
              }
            }
          }

          &[sd-open=true] {
            > ._content > label {
              background: var(--trans-color-light);
            }
          }

          &[sd-header=true] {
            > ._content > label {
              color: var(--text-reverse-color-dark);
            }
          }

          > ._child {
            > ._child-content {
              background: var(--trans-color-dark);

              sd-list {
                background: transparent;
              }

              sd-list-item {
                > ._content > label {
                  background: transparent;
                }

                &[sd-clickable=true] {
                  > ._content > label {
                    &:hover {
                      background: var(--trans-color-dark);
                    }
                  }
                }
              }
            }
          }
        }
      }

      > ._backdrop {
        display: none;
      }

      &[sd-toggle=true] {
        padding-left: 0;
        transition: padding-left .1s ease-in;

        > sd-sidebar {
          transform: translateX(-100%);
          transition: transform .1s ease-in;
        }
      }

      &[sd-hidden=true] {
        padding-left: 0;

        > sd-sidebar {
          display: none;
        }
      }

      @media screen and (max-width: $screen-mobile-width) {
        padding-left: 0;

        > sd-sidebar {
          @include elevation(none);
          transform: translateX(calc(-100% - 1px));
          transition: transform .2s ease-in;
        }

        ._backdrop {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, .4);
          opacity: 0;
          visibility: hidden;
          transition: .2s ease-in;
          z-index: calc(var(--z-index-sidebar) - 1);
        }

        &[sd-toggle=true] {
          > sd-sidebar {
            @include elevation(16);
            transform: none;
            transition: transform .2s ease-out;
          }

          ._backdrop {
            opacity: 1;
            visibility: visible;
            transition: .2s ease-out;
          }
        }
      }
    }
  `]
})
export class SdSidebarContainerControl {
  @HostBinding("attr.sd-toggle")
  public toggle = false;

  @HostBinding("attr.sd-hidden")
  public get hidden(): boolean {
    return this._window.isWindow;
  }

  public constructor(private readonly _router: Router,
                     private readonly _window: SdWindowProvider) {
    this._router.events.subscribe(value => {
      if (value instanceof NavigationStart) {
        this.toggle = false;
      }
    });
  }
}
