import {ChangeDetectionStrategy, Component, HostBinding, HostListener, Input} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";

@Component({
  selector: "sd-busy-container",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="_screen">
      <div class="_rect">
        <div class="_indicator"></div>
      </div>
    </div>
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      display: block;
      position: relative;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      min-width: 70px;
      min-height: 70px;

      > ._screen {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, .6);
        z-index: $z-index-busy;
        visibility: hidden;
        pointer-events: none;

        > ._rect {
          transform: translateY(-100%);
          opacity: 0;
          transition: .1s ease-in;
          transition-property: opacity, transform;

          > ._indicator {
            top: 0;
            width: 30px;
            height: 30px;
            margin: 20px auto 0 auto;
            border: 6px solid rgba(255, 255, 255, .5);
            border-radius: 100%;
            border-bottom-color: theme-color(primary, default);
            animation: _sd-busy-spin 1s linear infinite;
          }
        }
      }

      &[sd-busy=true] {
        > ._screen {
          visibility: visible;
          pointer-events: auto;

          > ._rect {
            transform: none;
            opacity: 1;
            transition: .1s ease-out;
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
  `]
})
export class SdBusyContainerControl {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-busy")
  public busy?: boolean;

  @HostListener("keydown", ["$event"])
  public onKeydown(event: KeyboardEvent): void {
    if (this.busy) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}