import {ChangeDetectionStrategy, Component, HostBinding, HostListener, Input, ViewEncapsulation} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";
import {SdBusyContainerProvider} from "./SdBusyContainerProvider";

@Component({
  selector: "sd-busy-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="_screen">
      <div class="_rect">
        <div class="_indicator"></div>
      </div>
    </div>
    <div class="_content">
      <ng-content></ng-content>
    </div>`,
  styles: [/* language=SCSS */ `
    sd-busy-container {
      display: block;
      position: relative;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      min-width: 70px;
      min-height: 70px;

      > ._content {
        position: relative;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
      }

      > ._screen {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, .2);
        z-index: var(--z-index-busy);
        visibility: hidden;
        pointer-events: none;
        opacity: 0;
        transition: opacity .3s linear;
      }

      &[sd-busy=true] {
        > ._screen {
          visibility: visible;
          pointer-events: auto;
          opacity: 1;
        }
      }

      &[sd-no-fade=true] {
        > ._screen {
          background: transparent;
          transition: none;
        }
      }

      &[sd-type=spinner] {
        > ._screen > ._rect {
          transform: translateY(-100%);
          transition: .1s ease-in;
          transition-property: transform;

          > ._indicator {
            top: 0;
            width: 30px;
            height: 30px;
            margin: 20px auto 0 auto;
            border: 6px solid white;
            border-radius: 100%;
            border-bottom-color: var(--theme-primary-default);
            animation: _sd-busy-spin 1s linear infinite;
          }
        }

        &[sd-busy=true] {
          > ._screen > ._rect {
            transform: none;
            transition: .1s ease-out;
          }
        }
      }

      &[sd-type=bar] {
        > ._screen > ._rect {
          > ._indicator {
          }
        }

        &[sd-busy=true] {
          > ._screen > ._rect {
            > ._indicator {
              position: absolute;
              top: 0;
              left: 0;
              height: 2px;
              width: 100%;
              background-color: white;

              &:before,
              &:after {
                position: absolute;
                top: 0;
                left: 0;
                display: inline-block;
                content: "";
                height: 2px;
                width: 100%;

                transform-origin: left;
              }

              &:before {
                background-color: var(--theme-primary-default);
                animation: _sd-busy-bar-indicator-before 2s infinite ease-in;
              }

              &:after {
                background-color: white;
                animation: _sd-busy-bar-indicator-after 2s infinite ease-out;
              }
            }
          }
        }
      }
    }

    @keyframes _sd-busy-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes _sd-busy-bar-indicator-before {
      0% {
        transform: scaleX(0);
      }
      60%, 100% {
        transform: scaleX(1.0);
      }
    }

    @keyframes _sd-busy-bar-indicator-after {
      0%, 50% {
        transform: scaleX(0);
      }
      100% {
        transform: scaleX(1.0);
      }
    }
  `]
})
export class SdBusyContainerControl {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-busy")
  public busy?: boolean;

  @Input()
  @SdTypeValidate({
    type: String,
    includes: ["spinner", "bar"]
  })
  @HostBinding("attr.sd-type")
  public type: "spinner" | "bar";

  @Input("no-fade")
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-no-fade")
  public noFade?: boolean;

  public constructor(private readonly _prov: SdBusyContainerProvider) {
    this.type = this._prov.type || "spinner";
    this.noFade = this._prov.noFade;
  }

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (this.busy) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
