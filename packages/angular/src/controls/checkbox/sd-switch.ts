import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  ViewEncapsulation,
} from "@angular/core";
import { setupModelHook } from "../../core/setupModelHook";

@Component({
  selector: "sd-switch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "[attr.data-sd-on]": "value()",
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.data-sd-inline]": "inline()",
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-theme]": "theme()",
    "[attr.tabindex]": "'0'",
    "(click)": "onClick($event)",
    "(keydown)": "onKeydown($event)",
  },
  template: `
    <div>
      <div></div>
    </div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../../scss/commons/variables";

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

          background: var(--theme-gray-lighter);

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
              background: var(--theme-gray-default);
            }
          }
        }
      }
    `,
  ],
})
export class SdSwitch {
  value = model(false);
  canChangeFn = input<(item: boolean) => boolean | Promise<boolean>>(() => true);

  disabled = input(false, { transform: booleanAttribute });
  inline = input(false, { transform: booleanAttribute });
  inset = input(false, { transform: booleanAttribute });

  size = input<"sm" | "lg">();
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >();

  constructor() {
    setupModelHook(this.value, this.canChangeFn);
  }

  onClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.disabled()) return;
    this.value.update((v) => !v);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      if (this.disabled()) return;
      this.value.update((v) => !v);
    }
  }
}
