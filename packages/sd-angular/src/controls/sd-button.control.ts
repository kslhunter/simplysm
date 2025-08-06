import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  input,
  viewChild,
  ViewEncapsulation,
} from "@angular/core";
import { transformBoolean } from "../utils/type-tramsforms";
import { setupRipple } from "../utils/setups/setup-ripple";

@Component({
  selector: "sd-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
    <button #btnEl hidden [type]="type()"></button>
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../scss/variables";
      @use "../scss/mixins";

      sd-button {
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

        &[data-sd-disabled="true"] {
          background: var(--control-color);
          border-color: var(--theme-grey-lighter);
          color: var(--text-trans-lighter);
          cursor: default;
          pointer-events: none;
        }

        &[data-sd-inset="true"] {
          border-radius: 0;
          border: none;
          color: var(--theme-primary-default);

          &:hover {
            color: var(--theme-primary-darker);
          }

          &[data-sd-disabled="true"] {
            background: var(--control-color);
            border-color: var(--theme-grey-lighter);
            color: var(--text-trans-default);
            cursor: default;
          }
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$key}"] {
            background: var(--theme-#{$key}-default);
            border-color: var(--theme-#{$key}-default);
            color: var(--text-trans-rev-default);

            &:hover {
              background: var(--theme-#{$key}-dark);
              border-color: var(--theme-#{$key}-dark);
              color: var(--text-trans-rev-default);
            }

            &[data-sd-disabled="true"] {
              background: var(--theme-grey-lighter);
              border-color: var(--theme-grey-lighter);
              color: var(--text-trans-lighter);
              cursor: default;
            }
          }
        }

        &[data-sd-theme="link"] {
          border-color: transparent;
          color: var(--theme-primary-default);

          &:hover {
            color: var(--theme-primary-darker);
          }

          &[data-sd-disabled="true"] {
            border-color: transparent;
            color: var(--text-trans-lighter);
          }
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="link-#{$key}"] {
            border-color: transparent;
            background: transparent;
            color: var(--theme-#{$key}-default);

            &:hover {
              background: var(--trans-lighter);
              color: var(--theme-#{$key}-darker);
            }

            &[data-sd-disabled="true"] {
              border-color: transparent;
              color: var(--text-trans-lighter);
            }
          }
        }

        &[data-sd-inline="true"] {
          display: inline-block;
          width: auto;
          vertical-align: top;
        }

        &[data-sd-size="sm"] {
          padding: var(--gap-xs) var(--gap-default);
        }

        &[data-sd-size="lg"] {
          padding: var(--gap-default) var(--gap-xl);
        }
      }
    `,
  ],
  host: {
    "tabindex": "0",
    "[attr.data-sd-theme]": "theme()",
    "[attr.data-sd-inline]": "inline()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-disabled]": "disabled()",
  },
})
export class SdButtonControl {
  btnElRef = viewChild.required<ElementRef<HTMLButtonElement>>("btnEl");

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

  constructor() {
    setupRipple(() => !this.disabled());
  }

  @HostListener("click")
  onClick() {
    if (this.type() === "submit") {
      this.btnElRef().nativeElement.form?.requestSubmit();
    }
  }
}
