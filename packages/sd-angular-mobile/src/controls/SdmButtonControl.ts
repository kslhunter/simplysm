import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "@simplysm/sd-angular";

@Component({
  selector: "sdm-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [attr.type]="type"
            [disabled]="disabled"
            [attr.class]="buttonClass"
            [attr.style]="buttonStyle">
      <ng-content></ng-content>
    </button>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    @import "../../../sd-angular/scss/_variables-scss-arr.scss";

    :host {
      > button {
        display: block;
        width: 100%;
        background: white;

        padding: var(--gap-sm) var(--gap-default);
        border: 1px solid var(--border-color);
        border-radius: var(--gap-xs);

        font-size: var(--font-size-default);
        font-family: var(--font-family);
        line-height: var(--line-height);
        font-weight: bold;
        text-align: center;
        color: var(--text-brightness-default);

        @include mobile-active-effect(true);

        &:disabled {
          border-color: var(--theme-color-grey-lighter);
          color: var(--text-brightness-lighter);
          
          @include mobile-active-effect(false);
        }
      }

      &[sd-inset=true] {
        > button {
          border-radius: 0;
          border: none;
          color: var(--theme-color-primary-default);

          &:disabled {
            color: var(--text-brightness-default);
          }
        }
      }

      &[sd-inline=true] > button {
        display: inline-block;
        width: auto;
        vertical-align: top;
      }

      &[sd-size=sm] > button {
        font-weight: normal;
        padding: var(--gap-xs) var(--gap-default);
      }

      &[sd-size=lg] > button {
        font-size: var(--font-size-lg);
        padding: var(--gap-default) var(--gap-xl);
      }

      @each $theme in $arr-theme-color {
        &[sd-theme=#{$theme}] {
          > button {
            background: var(--theme-color-#{$theme}-default);
            border-color: var(--theme-color-#{$theme}-default);
            color: var(--text-brightness-rev-default);

            &:disabled {
              background: var(--theme-color-grey-lighter);
              border-color: var(--theme-color-grey-lighter);
              color: var(--text-brightness-lighter);
            }
          }
        }
      }
    }
  `]
})
export class SdmButtonControl {
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["primary", "secondary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger";

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdInputValidate(Boolean)
  public disabled?: boolean;

  @Input("button.style")
  @SdInputValidate(String)
  public buttonStyle?: string;

  @Input("button.class")
  @SdInputValidate(String)
  public buttonClass?: string;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["button", "submit"],
    notnull: true
  })
  public type: "button" | "submit" = "button";
}
