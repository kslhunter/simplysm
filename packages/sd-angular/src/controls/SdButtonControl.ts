import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <button tabindex="0"
            [type]="type"
            [disabled]="disabled"
            [class]="buttonClass"
            [style]="buttonStyle">
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
        border-color: var(--border-color-default);
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

        @media all and (pointer: coarse) {
          @include active-effect(true);
        }

        &:disabled {
          background: white;
          border-color: var(--theme-grey-lighter);
          color: var(--text-trans-lighter);
          cursor: default;

          @media all and (pointer: coarse) {
            @include active-effect(false);
          }
        }
      }

      &[sd-inset=true] > button {
        border-radius: 0;
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

      &[sd-theme=link] > button {
        border-color: transparent;
        color: var(--theme-primary-default);

        &:hover {
          color: var(--theme-primary-darker);
        }

        &:disabled {
          border-color: transparent;
          color: var(--trans-brightness-defalt);
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
  @HostBinding("attr.sd-theme")
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey" | "link";

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inline")
  inline = false;

  @Input()
  @HostBinding("attr.sd-size")
  size?: "sm" | "lg";

  @Input({transform: coercionBoolean})
  @HostBinding("attr.disabled")
  disabled = false;

  @Input()
  buttonStyle?: string;

  @Input()
  buttonClass?: string;

  @Input()
  type: "button" | "submit" = "button";

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-inset")
  inset = false;
}
