import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {SdInputValidate} from "../utils/SdInputValidate";
import {sdThemes, TSdTheme} from "../commons";
import {CommonModule} from "@angular/common";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
  template: `
    <button tabindex="0"
            [attr.type]="type"
            [disabled]="disabled"
            [attr.class]="buttonClass"
            [attr.style]="buttonStyle">
      <ng-content></ng-content>
    </button>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";
    @import "../scss/mixins";

    :host {
      > button {
        @include form-control-base();
        user-select: none;
        padding: var(--gap-sm) var(--gap-lg);

        background: white;
        border-color: var(--border-color);
        border-radius: var(--border-radius-default);

        font-weight: bold;
        text-align: center;
        cursor: pointer;

        &:hover {
          background: var(--theme-grey-lightest);
        }

        &:active {
          background: var(--theme-grey-lighter);
        }

        &:disabled {
          background: white;
          border-color: var(--theme-grey-lighter);
          color: var(--text-trans-lighter);
          cursor: default;
        }
      }

      &[sd-inset] > button {
        border-radius: 0;
        border: none;
        color: var(--theme-primary-default);

        &:hover {
          color: var(--theme-primary-darker);
        }

        &:disabled {
          background: white;
          border-color: var(--theme-grey-lighter);
          // color:var(--text-trans-lighter);
          color: var(--text-trans-default);
          cursor: default;
        }
      }

      &[sd-link] > button {
        border: none;
        color: var(--theme-primary-default);

        &:hover {
          color: var(--theme-primary-darker);
        }

        &:disabled {
          background: white;
          border-color: var(--theme-grey-lighter);
          color: var(--text-trans-default);
          cursor: default;
        }
      }

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] > button {
          background: var(--theme-#{$key}-default);
          border-color: var(--theme-#{$key}-default);
          color: var(--text-trans-rev-default);

          &:hover {
            background: var(--theme-#{$key}-dark);
            border-color: var(--theme-#{$key}-dark);
            color: var(--text-trans-rev-default);
          }

          &:active {
            background: var(--theme-#{$key}-darker);
            border-color: var(--theme-#{$key}-darker);
            color: var(--text-trans-rev-default);
          }

          &:disabled {
            background: var(--theme-grey-lighter);
            border-color: var(--theme-grey-lighter);
            color: var(--text-trans-lighter);
            cursor: default;
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
        padding: var(--gap-default) var(--gap-xl);
        // border-radius:2 px;
      }

      &[disabled=true] {
        pointer-events: none;
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
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inline")
  public inline?: boolean;

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-link")
  public link?: boolean;

  @Input()
  @SdInputValidate({
    type: String,
    includes: ["sm", "lg"]
  })
  @HostBinding("attr.sd-size")
  public size?: "sm" | "lg";

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.disabled")
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

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;
}
