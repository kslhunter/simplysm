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
      @use "../../../scss/commons/variables";

      sd-switch {
        display: block;
        padding: var(--sd-gap-sm) 0;
        border: 1px solid transparent;
        vertical-align: top;
        cursor: pointer;

        > div {
          height: var(--sd-line-height);
          width: calc(var(--sd-line-height) * 2 - var(--sd-gap-xs));
          padding: calc(var(--sd-gap-xs) / 2);
          border-radius: calc(var(--sd-line-height) / 2);
          text-align: left;

          background-color: var(--sd-bg-track);

          > div {
            display: inline-block;
            width: calc(var(--sd-line-height) - var(--sd-gap-xs));
            height: calc(var(--sd-line-height) - var(--sd-gap-xs));
            border-radius: 100%;

            background-color: var(--sd-bg-knob);

            transition: transform var(--sd-animation-duration);
          }
        }

        &[data-sd-on="true"] {
          > div {
            background-color: var(--sd-bg-success-solid);

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
          padding: var(--sd-gap-sm) 0;
        }

        &[data-sd-size="lg"] {
          padding: var(--sd-gap-default) 0;
        }

        @each $key in variables.$theme-keys {
          &[data-sd-theme="#{$key}"] {
            &[data-sd-on="true"] {
              > div {
                background-color: var(--sd-bg-#{$key}-solid);
              }
            }
          }
        }

        // disabled 는 색 치환 단일 규약 (DEC-009 — opacity 방식 폐기)
        &[data-sd-disabled="true"] {
          > div {
            background-color: var(--sd-bg-disabled) !important;

            > div {
              background-color: var(--sd-bg-gray-solid);
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
  theme = input<"primary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray">();

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
