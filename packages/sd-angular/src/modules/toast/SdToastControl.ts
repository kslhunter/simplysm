import {ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input, ViewEncapsulation} from "@angular/core";
import {SdTypeValidate} from "../../commons/SdTypeValidate";

@Component({
  selector: "sd-toast",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="_sd-toast-block">
      <div class="_sd-toast-message">
        <ng-content></ng-content>
      </div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/presets";

    > sd-toast,
    > ._sd-toast {
      display: block;
      margin-bottom: var(--gap-sm);
      text-align: center;

      > ._sd-toast-block {
        display: inline-block;
        text-align: left;
        color: white;
        animation: _sd-toast-show .1s ease-out forwards;
        transform: translateY(-100%);
        border-radius: 4px;
        opacity: .9;
        @include elevation(6);

        > ._sd-toast-message {
          padding: var(--gap-sm) var(--gap-default);
        }

        > ._sd-toast-progress {
          background: var(--theme-grey-default);
          height: 4px;
          border-radius: 4px;

          > ._sd-toast-progress-bar {
            height: 4px;
            transition: width 1s ease-out;
          }
        }
      }

      @each $color in $arr-theme-color {
        &[sd-theme=#{$color}],
        &._sd-toast-#{$color} {
          > ._sd-toast-block {
            background: var(--theme-#{$color}-default);

            > ._sd-toast-progress {
              > ._sd-toast-progress-bar {
                background: var(--theme-#{$color}-default);
              }
            }
          }
        }
      }
    }

    @keyframes _sd-toast-show {
      to {
        transform: none;
      }
    }
  `]
})
export class SdToastControl {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  public close = new EventEmitter<any>();

  @Input()
  @SdTypeValidate({
    type: String,
    notnull: true,
    includes: ["primary", "secondary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" = "info";
}
