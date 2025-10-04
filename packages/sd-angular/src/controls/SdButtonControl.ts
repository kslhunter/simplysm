import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { SdRippleDirective } from "../directives/SdRippleDirective";
import { transformBoolean } from "../utils/transforms/tramsformBoolean";

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

      @use "../../scss/commons/variables";
      @use "../../scss/commons/mixins";

      sd-button {
        > button {
          @include mixins.form-control-base();
          user-select: none;
          padding: var(--gap-sm) var(--gap-lg);
          width: 100%;

          background: var(--control-color);
          border-color: var(--border-color-default);
          border-radius: var(--border-radius-default);

          font-weight: bold;
          text-align: center;
          cursor: pointer;

          transition: 0.1s linear;
          transition-property: border, background;

          &:hover {
            background: var(--theme-gray-lightest);
          }

          &:disabled {
            background: var(--control-color);
            border-color: var(--theme-gray-lighter);
            color: var(--text-trans-lighter);
            cursor: default;
          }
        }

        &[data-sd-inset="true"] > button {
          border-radius: 0;
          border: none;
          color: var(--theme-primary-default);

          &:hover {
            color: var(--theme-primary-darker);
          }

          &:disabled {
            background: var(--control-color);
            border-color: var(--theme-gray-lighter);
            color: var(--text-trans-default);
            cursor: default;
          }
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$key}"] > button {
            background: var(--theme-#{$key}-default);
            border-color: var(--theme-#{$key}-default);
            color: white; //var(--text-trans-rev-default);

            &:hover {
              background: var(--theme-#{$key}-dark);
              border-color: var(--theme-#{$key}-dark);
              color: white; //var(--text-trans-rev-default);
            }

            &:disabled {
              background: var(--theme-gray-lighter);
              border-color: var(--theme-gray-lighter);
              color: var(--text-trans-lighter);
              cursor: default;
            }
          }
        }

        &[data-sd-theme="link"] > button {
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
          &[data-sd-theme="link-#{$key}"] > button {
            border-color: transparent;
            background: transparent;
            color: var(--theme-#{$key}-default);

            &:hover {
              background: var(--trans-lighter);
              color: var(--theme-#{$key}-darker);
            }

            &:disabled {
              border-color: transparent;
              color: var(--text-trans-lighter);
            }
          }
        }

        &[data-sd-inline="true"] > button {
          display: inline-block;
          width: auto;
          vertical-align: top;
        }

        &[data-sd-size="sm"] > button {
          padding: var(--gap-xs) var(--gap-default);
        }

        &[data-sd-size="lg"] > button {
          padding: var(--gap-default) var(--gap-xl);
        }

        &:has(button[disabled]) {
          &:active {
            pointer-events: none;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-theme]": "theme()",
    "[attr.data-sd-inline]": "inline()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-inset]": "inset()",
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
    | "gray"
    | "blue-gray"
    | "link"
    | "link-primary"
    | "link-secondary"
    | "link-info"
    | "link-success"
    | "link-warning"
    | "link-danger"
    | "link-gray"
    | "link-blue-gray"
  >();

  inline = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();

  disabled = input(false, { transform: transformBoolean });

  buttonStyle = input<string>();
  buttonClass = input<string>();
}
