import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../decorators/SdInputValidate";
import { sdThemes, TSdTheme } from "../commons";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [attr.type]="type">
      <ng-content></ng-content>
    </button>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/scss_settings";

    :host {
      display: block;
      position: relative;

      > button {
        @include form-control-base();
        user-select: none;
        padding: var(--gap-sm) var(--gap-lg);

        border-color: var(--border-color);
        background: white;
        font-weight: bold;
        text-align: center;
        cursor: pointer;

        &:hover {
          background: var(--theme-color-grey-lightest);
        }

        &:active {
          background: var(--theme-color-grey-lighter);
        }
      }

      &[sd-inline=true] {
        display: inline-block;
      }

      &[sd-inset=true] {
        > button {
          border-radius: 0;
          border: none;
          color: var(--theme-color-primary-default);

          &:hover {
            color: var(--theme-color-primary-darker);
          }
        }
      }

      &[sd-size=sm] > button {
        font-weight: normal;
        padding: var(--gap-xs) var(--gap-default);
      }

      &[sd-size=lg] > button {
        padding: var(--gap-default) var(--gap-xl);
      }

      @each $theme in $arr-theme-color {
        &[sd-theme=#{$theme}] > button {
          background: var(--theme-color-#{$theme}-default);
          border-color: var(--theme-color-#{$theme}-default);
          color: var(--text-brightness-rev-default);

          &:hover {
            background: var(--theme-color-#{$theme}-dark);
            border-color: var(--theme-color-#{$theme}-dark);
            color: var(--text-brightness-rev-default);
          }

          &:active {
            background: var(--theme-color-#{$theme}-darker);
            border-color: var(--theme-color-#{$theme}-darker);
            color: var(--text-brightness-rev-default);
          }
        }
      }

      &[sd-disabled=true] {
        pointer-events: none;

        > button {
          background: var(--theme-color-grey-lighter);
          border-color: var(--theme-color-grey-lighter);
          color: var(--text-brightness-lighter);
          cursor: default;
        }
      }
    }
  `]
})
export class SdButtonControl {
  @Input()
  @SdInputValidate({
    type: String,
    includes: sdThemes
  })
  @HostBinding("attr.sd-theme")
  public theme?: TSdTheme;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-disabled")
  public disabled?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["button", "submit", "reset"],
    notnull: true
  })
  public type: "button" | "submit" | "reset" = "button";

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;
}
