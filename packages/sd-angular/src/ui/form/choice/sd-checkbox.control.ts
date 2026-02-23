import { ChangeDetectionStrategy, Component, input, model, ViewEncapsulation } from "@angular/core";
import { setupRipple } from "../../../core/utils/setups/setupRipple";
import { transformBoolean } from "../../../core/utils/transforms/transformBoolean";
import { setupModelHook } from "../../../core/utils/setups/setupModelHook";
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
      @use "sass:map";

      @use "../../../../scss/commons/variables";
      @use "../../../../scss/commons/mixins";

      sd-checkbox {
        @include mixins.form-control-base();
        color: inherit;
        cursor: pointer;
        //border-radius: var(--border-radius-default);

        height: calc(
          var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2 + 2px
        );
        gap: var(--gap-sm);

        @supports not (appearance: auto) {
          gap: 0;
          > * + * {
            margin-left: var(--gap-sm);
          }
        }

        > ._indicator_rect {
          display: inline-block;
          //vertical-align: calc((1em - var(--line-height)) / 2);
          vertical-align: -0.125em;
          user-select: none;

          width: calc(var(--font-size-default) + 2px);
          height: calc(var(--font-size-default) + 2px);
          border: 1px solid var(--trans-light);
          background: var(--theme-secondary-lightest);
          //border-radius: var(--border-radius-xs);

          > ._indicator {
            margin: -1px -2px;
            text-align: center;
            opacity: 0;
            color: white;

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
          padding-left: var(--gap-sm);
        }

        > ._indicator_rect + ._contents:empty {
          display: none;
        }

        &:focus > ._indicator_rect {
          border-color: var(--theme-primary-dark);
        }

        &[data-sd-checked="true"] {
          > ._indicator_rect {
            background: var(--theme-primary-default);

            > ._indicator {
              opacity: 1;
            }
          }
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$key}"] {
            > ._indicator_rect {
              background: var(--theme-#{$key}-lightest);

              > ._indicator {
                color: var(--theme-#{$key}-default);
              }
            }

            &:focus {
              > ._indicator_rect {
                border-color: var(--theme-#{$key}-default);
              }
            }

            &[data-sd-checked="true"] {
              > ._indicator_rect {
                background: var(--theme-#{$key}-default);

                > ._indicator {
                  color: white;
                }
              }
            }
          }
        }

        &[data-sd-theme="white"] {
          > ._indicator_rect {
            background: var(--control-color);
            border-color: var(--text-trans-lightest);
          }

          &:focus {
            > ._indicator_rect {
              border-color: var(--text-trans-default);
            }
          }

          &[data-sd-checked="true"] {
            > ._indicator_rect {
              background: var(--theme-primary-default);
            }
          }
        }

        &[data-sd-radio="true"] {
          > ._indicator_rect {
            border-radius: 100%;
            padding: var(--gap-xs);

            > ._indicator {
              border-radius: 100%;
              width: 100%;
              height: 100%;
              background: var(--theme-primary-default);
            }
          }

          &[data-sd-checked="true"] {
            > ._indicator_rect {
              background: var(--theme-secondary-lightest);
              border-color: var(--theme-primary-dark);
            }
          }
        }

        &[data-sd-size="sm"] {
          height: calc(
            var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-xs) * 2 + 2px
          );
          padding: var(--gap-xs) var(--gap-sm);
          gap: var(--gap-xs);

          @supports not (appearance: auto) {
            gap: 0;
            > * + * {
              margin-left: var(--gap-xs);
            }
          }
        }

        &[data-sd-size="lg"] {
          height: calc(
            var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-default) * 2 + 2px
          );
          padding: var(--gap-default) var(--gap-lg);
          gap: var(--gap-default);

          @supports not (appearance: auto) {
            gap: 0;
            > * + * {
              margin-left: var(--gap-default);
            }
          }
        }

        &[data-sd-inset="true"] {
          height: calc(
            var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-sm) * 2
          );
          border: none;
          justify-content: center;
          text-align: center;

          &[data-sd-size="sm"] {
            height: calc(
              var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-xs) * 2
            );
          }

          &[data-sd-size="lg"] {
            height: calc(
              var(--font-size-default) * var(--line-height-strip-unit) + var(--gap-default) * 2
            );
          }
        }

        &[data-sd-inline="true"] {
          display: inline-block;
          vertical-align: top;
          padding: 0;
          border: none;
          height: calc(var(--font-size-default) * var(--line-height-strip-unit));
          width: auto;
        }

        &[data-sd-disabled="true"] {
          opacity: 0.3;
          pointer-events: none;
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
    "[attr.tabindex]": "0",
    "(click)": "onClick()",
    "(keydown)": "onKeydown($event)",
  },
})
export class SdCheckboxControl {
  value = model(false);
  canChangeFn = input<(item: boolean) => boolean | Promise<boolean>>(() => true);

  icon = input(tablerCheck);
  radio = input(false, { transform: transformBoolean });
  disabled = input(false, { transform: transformBoolean });

  size = input<"sm" | "lg">();
  inline = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });
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

  onClick() {
    if (this.disabled()) return;
    if (this.radio()) {
      this.value.set(true);
    } else {
      this.value.update((v) => !v);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === " ") {
      if (this.disabled()) return;
      if (this.radio()) {
        this.value.set(true);
      } else {
        this.value.update((v) => !v);
      }
    }
  }
}
