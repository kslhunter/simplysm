import { ChangeDetectionStrategy, Component, HostListener, input, model, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/type-tramsforms";

@Component({
  selector: "sd-switch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../scss/variables";

      sd-switch {
        display: block;
        padding: var(--gap-sm) 0;
        border: 1px solid transparent;
        vertical-align: top;
        cursor: pointer;

        > div {
          height: var(--line-height);
          width: calc(var(--line-height) * 2 - var(--gap-xs));
          padding: calc(var(--gap-xs) / 2);
          border-radius: calc(var(--line-height) / 2);
          text-align: left;

          background: var(--theme-grey-lighter);

          > div {
            display: inline-block;
            width: calc(var(--line-height) - var(--gap-xs));
            height: calc(var(--line-height) - var(--gap-xs));
            border-radius: 100%;

            background: var(--control-color);

            transition: transform var(--animation-duration);
          }
        }

        &[data-sd-on="true"] {
          > div {
            background: var(--theme-success-default);

            > div {
              transform: translateX(100%);
            }
          }
        }

        &[data-sd-inline="true"] {
          display: inline-block;
          padding: 0;
          border: none;
        }

        &[data-sd-inset="true"] {
          border: none;
        }

        &[data-sd-size="sm"] {
          padding: var(--gap-sm) 0;
        }

        &[data-sd-size="lg"] {
          font-size: var(--font-size-lg);
          padding: var(--gap-default) 0;
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$key}"] {
            &[data-sd-on="true"] {
              > div {
                background: var(--theme-#{$key}-default);
              }
            }
          }
        }

        &[data-sd-disabled="true"] {
          > div {
            opacity: 0.5;

            > div {
              background: var(--theme-grey-default);
            }
          }
        }
      }
    `,
  ],
  template: `
    <div>
      <div></div>
    </div>
  `,
  host: {
    "[attr.data-sd-on]": "value()",
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.data-sd-inline]": "inline()",
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-theme]": "theme()",
    "[attr.tabindex]": "'0'",
  },
})
export class SdSwitchControl {
  value = model(false);

  disabled = input(false, { transform: transformBoolean });
  inline = input(false, { transform: transformBoolean });
  inset = input(false, { transform: transformBoolean });

  size = input<"sm" | "lg">();
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();

  @HostListener("click", ["$event"])
  onClick(event: Event) {
    if (this.disabled()) return;

    event.preventDefault();
    event.stopPropagation();

    this.value.update((v) => !v);
  }

  @HostListener("keydown", ["$event"])
  onKeydown(event: KeyboardEvent) {
    if (this.disabled()) return;

    if (event.key === " ") {
      this.value.update((v) => !v);
    }
  }
}
