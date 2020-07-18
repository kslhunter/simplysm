import { ChangeDetectionStrategy, Component, EventEmitter, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../commons/SdInputValidate";

@Component({
  selector: "sd-toast",
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    @import "../../scss/mixins";
    @import "../../scss/variables-scss-arr";

    :host {
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
          background: var(--theme-color-grey-default);
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
            background: var(--theme-color-#{$color}-default);

            > ._sd-toast-progress {
              > ._sd-toast-progress-bar {
                background: var(--theme-color-#{$color}-default);
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
export class SdToastEntryControl {
  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-open")
  public open?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  public useProgress?: boolean;

  @Input()
  @SdInputValidate(Number)
  public progress?: number;

  public close = new EventEmitter<any>();

  @Input()
  @SdInputValidate({
    type: String,
    notnull: true,
    includes: ["primary", "secondary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" = "info";
}
