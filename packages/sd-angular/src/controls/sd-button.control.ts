import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { SdRippleDirective } from "../directives/sd-ripple.directive";
import { transformBoolean } from "../utils/type-tramsforms";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdRippleDirective],
  template: `
    <button
      tabindex="0"
      [type]="type()"
      [disabled]="disabled()"
      [class]="buttonClass()"
      [style]="buttonStyle()"
      [sd-ripple]="!disabled()"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../scss/variables";
      @use "../scss/mixins";

      sd-button {
        > button {
          @include mixins.form-control-base();
          user-select: none;
          padding: var(--gap-sm) var(--gap-lg);

          background: var(--control-color);
          border-color: var(--border-color-default);
          border-radius: var(--border-radius-default);
          //@include mixins.elevation(1);

          font-weight: bold;
          text-align: center;
          cursor: pointer;

          transition: 0.1s linear;
          transition-property: border, background;

          &:hover {
            background: var(--theme-grey-lightest);
          }

          &:disabled {
            background: var(--control-color);
            border-color: var(--theme-grey-lighter);
            color: var(--text-trans-lighter);
            cursor: default;
          }
        }

        &[sd-inset="true"] > button {
          border-radius: 0;
          border: none;
          color: var(--theme-primary-default);

          &:hover {
            color: var(--theme-primary-darker);
          }

          &:disabled {
            background: var(--control-color);
            border-color: var(--theme-grey-lighter);
            color: var(--text-trans-default);
            cursor: default;
          }
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[sd-theme="#{$key}"] > button {
            background: var(--theme-#{$key}-default);
            border-color: var(--theme-#{$key}-default);
            color: var(--text-trans-rev-default);

            &:hover {
              background: var(--theme-#{$key}-dark);
              border-color: var(--theme-#{$key}-dark);
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

        &[sd-theme="link"] > button {
          border-color: transparent;
          color: var(--theme-primary-default);

          &:hover {
            color: var(--theme-primary-darker);
          }

          &:disabled {
            border-color: transparent;
            color: var(--text-trans-lighter);
          }
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[sd-theme="link-#{$key}"] > button {
            border-color: transparent;
            color: var(--theme-#{$key}-default);

            &:hover {
              color: var(--theme-#{$key}-darker);
            }

            &:disabled {
              border-color: transparent;
              color: var(--text-trans-lighter);
            }
          }
        }

        &[sd-inline="true"] > button {
          display: inline-block;
          width: auto;
          vertical-align: top;
        }

        &[sd-size="sm"] > button {
          //font-weight: normal;
          padding: var(--gap-xs) var(--gap-default);
        }

        &[sd-size="lg"] > button {
          padding: var(--gap-default) var(--gap-xl);
          // border-radius:2 px;
        }

        &[disabled="true"] {
          &:active {
            pointer-events: none;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-theme]": "theme()",
    "[attr.sd-inline]": "inline()",
    "[attr.sd-size]": "size()",
    "[attr.disabled]": "disabled()",
    "[attr.sd-inset]": "inset()",
  },
})
export class SdButtonControl {
  type = input<"button" | "submit">("button");
  theme = input<
    | "primary"
    | "secondary"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "grey"
    | "blue-grey"
    | "link"
    | "link-primary"
    | "link-secondary"
    | "link-info"
    | "link-success"
    | "link-warning"
    | "link-danger"
    | "link-grey"
    | "link-blue-grey"
  >();

  inline = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();

  disabled = input(false, { transform: transformBoolean });

  buttonStyle = input<string>();
  buttonClass = input<string>();
}
