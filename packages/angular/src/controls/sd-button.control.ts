import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdTypeValidate} from "../decorators/SdTypeValidate";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [type]="type">
      <ng-content></ng-content>
    </button>`,
  styles: [/* language=SCSS */ `
    @import "../../styles/presets";

    :host {
      & > button {
        @include form-control-base();

        background: transparent;
        cursor: pointer;
        transition: .1s linear;
        color: theme-color(primary, default);

        &:hover {
          background: trans-color(dark);
        }

        &:active {
          transition: none;
          background: trans-color(darker);
        }
      }

      @each $theme, $colors in $theme-color {
        &[sd-theme=#{$theme}] > button {
          border-color: get($colors, default);
          color: text-color(default);

          &:hover {
            background: get($colors, default);
            color: text-color(reverse, default);
          }

          &:active {
            background: get($colors, dark);
          }
        }
      }

      &[sd-size=sm] > button {
        padding: gap(xs) gap(sm);
      }

      &[sd-size=lg] > button {
        padding: gap(default) gap(lg);
      }
    }
  `]
})
export class SdButtonControl {
  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["primary", "info", "success", "warning", "danger"].includes(value)
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["sm", "lg"].includes(value)
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdTypeValidate({
    type: String,
    validator: value => ["button", "submit"].includes(value),
    notnull: true
  })
  public type: "button" | "submit" = "button";
}