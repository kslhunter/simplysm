import { ChangeDetectionStrategy, Component, HostBinding, Input } from "@angular/core";
import { SdInputValidate } from "../commons/SdInputValidate";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button tabindex="0"
            [attr.type]="type"
            [disabled]="disabled"
            [attr.class]="safeHtml(buttonClass)"
            [attr.style]="safeHtml(buttonStyle)">
      <ng-content></ng-content>
    </button>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/mixins";
    @import "../../scss/variables-scss-arr";

    :host {
      > button {
        @include form-control-base();
        padding: var(--gap-sm) var(--gap-lg);

        background: white;
        border-color: var(--sd-border-color);
        border-radius: 2px;

        font-weight: bold;
        text-align: center;
        cursor: pointer;

        &:hover {
          background: var(--theme-color-grey-lightest);
        }

        &:active {
          background: var(--theme-color-grey-lighter);
        }

        &:disabled {
          background: white;
          border-color: var(--theme-color-grey-lighter);
          color: var(--text-brightness-lighter);
          cursor: default;
        }
      }

      &[sd-inset] > button {
        border-radius: 0;
        border: none;
        color: var(--theme-color-primary-default);

        &:hover {
          color: var(--theme-color-primary-darker);
        }

        &:disabled {
          background: white;
          border-color: var(--theme-color-grey-lighter);
          color: var(--text-brightness-lighter);
          cursor: default;
        }
      }

      @each $theme in $arr-theme-color {
        &[sd-theme=#{$theme}] > button {
          background: var(--theme-color-#{$theme}-default);
          border-color: var(--theme-color-#{$theme}-default);
          color: var(--text-brightness-rev-default);

          &:hover {
            background: var(--theme-color-#{$theme}-dark);
            border-color: var(--theme-color-#{$theme}-dark);
          }

          &:active {
            background: var(--theme-color-#{$theme}-darker);
            border-color: var(--theme-color-#{$theme}-darker);
          }

          &:disabled {
            background: var(--theme-color-grey-lighter);
            border-color: var(--theme-color-grey-lighter);
            color: var(--text-brightness-lighter);
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
        padding: var(--gap-xs) var(--gap-default);
      }

      &[sd-size=lg] > button {
        padding: var(--gap-default) var(--gap-xl);
        border-radius: 2px;
      }
    }
  `]
})
export class SdButtonControl {
  @Input()
  @SdInputValidate({
    type: String,
    includes: ["primary", "secondary", "info", "success", "warning", "danger"]
  })
  @HostBinding("attr.sd-theme")
  public theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger";

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

  @Input()
  @SdInputValidate(Boolean)
  @HostBinding("attr.sd-inset")
  public inset?: boolean;

  public constructor(private readonly _sanitization: DomSanitizer) {
  }

  public safeHtml(value?: string): SafeHtml | undefined {
    return value !== undefined ? this._sanitization.bypassSecurityTrustStyle(value) : undefined;
  }
}
