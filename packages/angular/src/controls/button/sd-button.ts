import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { SdRipple } from "../../core/ripple/sd-ripple";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdRipple],
  template: `
    <button
      tabindex="0"
      [type]="type()"
      [disabled]="disabled()"
      [class]="buttonClass()"
      [style]="buttonStyle()"
      [sdRipple]="!disabled()"
    >
      <ng-content />
    </button>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/variables";
      @use "../../../scss/commons/mixins";

      sd-button {
        > button {
          @include mixins.form-control-base();
          user-select: none;
          padding: var(--sd-gap-sm) var(--sd-gap-lg);
          width: 100%;

          background-color: var(--sd-bg-content);
          border-color: var(--sd-bd-strong);
          border-radius: var(--sd-radius-default);

          font-weight: bold;
          text-align: center;
          cursor: pointer;

          transition: var(--sd-animation-duration) linear;
          transition-property: border, background;

          &:hover {
            background-color: var(--sd-bg-state-hover);
          }

          &:disabled {
            background-color: var(--sd-bg-disabled);
            border-color: var(--sd-bd-disabled);
            color: var(--sd-tx-disabled);
            cursor: default;
          }
        }

        &[data-sd-inset="true"] > button {
          border-radius: 0;
          border: none;
          color: var(--sd-tx-primary);

          &:hover {
            color: var(--sd-tx-primary-hover);
          }

          &:disabled {
            background-color: var(--sd-bg-disabled);
            border-color: var(--sd-bd-disabled);
            color: var(--sd-tx-disabled);
            cursor: default;
          }
        }

        @each $key in variables.$theme-keys {
          &[data-sd-theme="#{$key}"] > button {
            background-color: var(--sd-bg-#{$key}-solid);
            border-color: var(--sd-bd-#{$key}-solid);
            color: var(--sd-tx-#{$key}-solid);

            &:hover {
              background-color: var(--sd-bg-#{$key}-solid-hover);
              border-color: var(--sd-bd-#{$key}-solid-hover);
              color: var(--sd-tx-#{$key}-solid);
            }

            &:disabled {
              background-color: var(--sd-bg-disabled);
              border-color: var(--sd-bd-disabled);
              color: var(--sd-tx-disabled);
              cursor: default;
            }
          }
        }

        &[data-sd-theme="link"] > button {
          border-color: transparent;
          background-color: transparent;
          color: var(--sd-tx-primary);

          &:hover {
            color: var(--sd-tx-primary-hover);
          }

          &:disabled {
            border-color: transparent;
            color: var(--sd-tx-disabled);
          }
        }

        @each $key in variables.$theme-keys {
          &[data-sd-theme="link-#{$key}"] > button {
            border-color: transparent;
            background-color: transparent;
            color: var(--sd-tx-#{$key});

            &:hover {
              background-color: var(--sd-bg-state-hover);
              color: var(--sd-tx-#{$key}-hover);
            }

            &:disabled {
              border-color: transparent;
              color: var(--sd-tx-disabled);
            }
          }
        }

        &[data-sd-theme="link-rev"] > button {
          border-color: transparent;
          background-color: transparent;
          color: var(--sd-tx-on-inverse);

          &:hover {
            color: var(--sd-tx-on-inverse-muted);
          }

          &:disabled {
            border-color: transparent;
            color: var(--sd-tx-on-inverse-disabled);
          }
        }

        &[data-sd-inline="true"] > button {
          display: inline-block;
          width: auto;
          vertical-align: top;
        }

        &[data-sd-size="xs"] > button {
          padding: var(--sd-gap-xxs) var(--sd-gap-xs);
        }

        &[data-sd-size="sm"] > button {
          padding: var(--sd-gap-xs) var(--sd-gap-default);
        }

        &[data-sd-size="lg"] > button {
          padding: var(--sd-gap-default) var(--sd-gap-xl);
        }

        &[data-sd-disabled="true"] {
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
    "[attr.data-sd-disabled]": "disabled()",
  },
})
export class SdButton {
  type = input<"button" | "submit">("button");
  theme = input<
    | "primary"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "gray"
    | "blue-gray"
    | "link"
    | "link-primary"
    | "link-info"
    | "link-success"
    | "link-warning"
    | "link-danger"
    | "link-gray"
    | "link-blue-gray"
    | "link-rev"
  >();
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  size = input<"xs" | "sm" | "lg">();
  disabled = input(false, { transform: booleanAttribute });
  buttonStyle = input<string>();
  buttonClass = input<string>();
}
