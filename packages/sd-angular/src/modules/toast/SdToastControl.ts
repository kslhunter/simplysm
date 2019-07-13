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
      <div class="_sd-toast-progress" *ngIf="useProgress">
        <div class="_sd-toast-progress-bar" [style.width.%]="progress">
        </div>
      </div>
    </div>`,
  styles: [/* language=SCSS */ `
    @import "../../../scss/mixins";
    @import "../../../scss/variables-scss";

    sd-toast {
      display: block;
      margin-bottom: var(--gap-sm);
      text-align: center;

      > ._sd-toast-block {
        display: inline-block;
        text-align: left;
        color: white;
        transform: translateY(-100%);
        border-radius: 4px;
        opacity: 0;
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
        &[sd-theme=#{$color}] {
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

      &[sd-open=true] {
        > ._sd-toast-block {
          transform: none;
          transition: .1s ease-out;
          transition-property: transform, opacity;
          opacity: .9;   
        }
      }
      &[sd-open=false] {
        > ._sd-toast-block {
          transform: translateY(-100%);
          transition: .1s ease-in;
          transition-property: transform, opacity;
          opacity: 0;
        }
      }
    }
  `]
})
export class SdToastControl {
  @Input()
  @SdTypeValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @Input()
  @SdTypeValidate(Boolean)
  public useProgress?: boolean;

  @Input()
  @SdTypeValidate(Number)
  public progress?: number;

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
