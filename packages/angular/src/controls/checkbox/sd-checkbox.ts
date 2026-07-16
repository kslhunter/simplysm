import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { setupRipple } from "../../core/ripple/setupRipple";
import { setupModelHook } from "../../core/setupModelHook";
import { NgIcon } from "@ng-icons/core";
import { tablerCheck } from "@ng-icons/tabler-icons";

@Component({
  selector: "sd-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [NgIcon],
  template: `
    <div class="_indicator_rect">
      <div class="_indicator">
        @if (!radio()) {
          <ng-icon [svg]="icon()" />
        } @else {
          <div></div>
        }
      </div>
    </div>
    <div class="_contents" [style]="contentStyle()">
      <ng-content />
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/variables";
      @use "../../../scss/commons/mixins";

      sd-checkbox {
        @include mixins.form-control-base();
        color: inherit;
        cursor: pointer;

        height: calc(
          var(--sd-font-size-default) * var(--sd-line-height-strip-unit) + var(--sd-gap-sm) * 2 +
            2px
        );
        gap: var(--sd-gap-sm);

        @supports not (appearance: auto) {
          gap: 0;
          > * + * {
            margin-left: var(--sd-gap-sm);
          }
        }

        > ._indicator_rect {
          display: inline-block;
          vertical-align: -0.125em;
          user-select: none;

          width: calc(var(--sd-font-size-default) + 2px);
          height: calc(var(--sd-font-size-default) + 2px);
          border: 1px solid var(--sd-bd-field);
          background-color: var(--sd-bg-field);

          > ._indicator {
            margin: -1px -2px;
            text-align: center;
            opacity: 0;
            color: var(--sd-tx-primary-solid);

            > ng-icon {
              > svg {
                vertical-align: top;
                stroke-width: 2.5px !important;
              }
            }
          }
        }

        ._contents {
          display: inline-block;
          vertical-align: top;
          padding-left: var(--sd-gap-sm);
        }

        > ._indicator_rect + ._contents:empty {
          display: none;
        }

        &:focus > ._indicator_rect {
          border-color: var(--sd-focus-ring-color);
        }

        &[data-sd-checked="true"] {
          > ._indicator_rect {
            border-color: var(--sd-bd-primary-solid);
            background-color: var(--sd-bg-primary-solid);

            > ._indicator {
              opacity: 1;
            }
          }
        }

        @each $key in variables.$theme-keys {
          &[data-sd-theme="#{$key}"] {
            > ._indicator_rect {
              background-color: var(--sd-bg-#{$key}-subtle);

              > ._indicator {
                color: var(--sd-tx-#{$key});
              }
            }

            &[data-sd-checked="true"] {
              > ._indicator_rect {
                border-color: var(--sd-bd-#{$key}-solid);
                background-color: var(--sd-bg-#{$key}-solid);

                > ._indicator {
                  color: var(--sd-tx-#{$key}-solid);
                }
              }
            }

            &:focus {
              > ._indicator_rect {
                border-color: var(--sd-focus-ring-color);
              }
            }
          }
        }

        &[data-sd-theme="white"] {
          > ._indicator_rect {
            background-color: var(--sd-bg-control);
            border-color: var(--sd-bd-field);
          }

          &[data-sd-checked="true"] {
            > ._indicator_rect {
              border-color: var(--sd-bd-primary-solid);
              background-color: var(--sd-bg-primary-solid);
            }
          }

          &:focus {
            > ._indicator_rect {
              border-color: var(--sd-focus-ring-color);
            }
          }
        }

        &[data-sd-radio="true"] {
          > ._indicator_rect {
            border-radius: 100%;
            padding: var(--sd-gap-xs);

            > ._indicator {
              border-radius: 100%;
              width: 100%;
              height: 100%;
              background-color: var(--sd-bg-primary-solid);
            }
          }

          &[data-sd-checked="true"] {
            > ._indicator_rect {
              background-color: var(--sd-bg-field);
              border-color: var(--sd-bd-primary-solid);
            }
          }
        }

        &[data-sd-size="sm"] {
          height: calc(
            var(--sd-font-size-default) * var(--sd-line-height-strip-unit) + var(--sd-gap-xs) * 2 +
              2px
          );
          padding: var(--sd-gap-xs) var(--sd-gap-sm);
          gap: var(--sd-gap-xs);

          @supports not (appearance: auto) {
            gap: 0;
            > * + * {
              margin-left: var(--sd-gap-xs);
            }
          }
        }

        &[data-sd-size="lg"] {
          height: calc(
            var(--sd-font-size-default) * var(--sd-line-height-strip-unit) + var(--sd-gap-default) *
              2 + 2px
          );
          padding: var(--sd-gap-default) var(--sd-gap-lg);
          gap: var(--sd-gap-default);

          @supports not (appearance: auto) {
            gap: 0;
            > * + * {
              margin-left: var(--sd-gap-default);
            }
          }
        }

        &[data-sd-inset="true"] {
          height: calc(
            var(--sd-font-size-default) * var(--sd-line-height-strip-unit) + var(--sd-gap-sm) * 2
          );
          border: none;
          justify-content: center;
          text-align: center;

          &[data-sd-size="sm"] {
            height: calc(
              var(--sd-font-size-default) * var(--sd-line-height-strip-unit) + var(--sd-gap-xs) * 2
            );
          }

          &[data-sd-size="lg"] {
            height: calc(
              var(--sd-font-size-default) * var(--sd-line-height-strip-unit) +
                var(--sd-gap-default) * 2
            );
          }
        }

        &[data-sd-inline="true"] {
          display: inline-block;
          vertical-align: top;
          padding: 0;
          border: none;
          height: calc(var(--sd-font-size-default) * var(--sd-line-height-strip-unit));
          width: auto;
        }

        // disabled 는 색 치환 단일 규약 (DEC-009 — opacity 방식 폐기)
        &[data-sd-disabled="true"] {
          color: var(--sd-tx-disabled) !important;
          pointer-events: none;

          > ._indicator_rect {
            background-color: var(--sd-bg-disabled) !important;
            border-color: var(--sd-bd-disabled) !important;

            > ._indicator {
              color: var(--sd-tx-disabled) !important;
            }
          }
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-checked]": "value()",
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.data-sd-inline]": "inline()",
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-radio]": "radio()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-theme]": "theme()",
    "[attr.tabindex]": "'0'",
    "(click)": "onClick($event)",
    "(keydown)": "onKeydown($event)",
  },
})
export class SdCheckbox {
  value = model(false);
  canChangeFn = input<(item: boolean) => boolean | Promise<boolean>>(() => true);

  icon = input(tablerCheck);
  radio = input(false, { transform: booleanAttribute });
  disabled = input(false, { transform: booleanAttribute });

  size = input<"sm" | "lg">();
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });
  theme = input<
    | "primary"
    | "secondary"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "gray"
    | "blue-gray"
    | "white"
  >();

  contentStyle = input<string>();

  constructor() {
    setupModelHook(this.value, this.canChangeFn);
    setupRipple(() => !this.disabled());
  }

  onClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.disabled()) return;
    if (this.radio()) {
      this.value.set(true);
    } else {
      this.value.update((v) => !v);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (this.disabled()) return;
      if (this.radio()) {
        this.value.set(true);
      } else {
        this.value.update((v) => !v);
      }
    }
  }
}
