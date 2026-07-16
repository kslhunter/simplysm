import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from "@angular/core";
import { PercentPipe } from "@angular/common";

@Component({
  selector: "sd-progress",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [PercentPipe],
  host: {
    "[attr.data-sd-inset]": "inset()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-theme]": "theme()",
  },
  template: `
    <div class="_content tx-right">
      {{ value() | percent: "1.0-2" }}
    </div>
    <div class="_progress" [style.width]="_barWidth()"></div>
  `,
  styles: [
    /* language=SCSS */ `
      @use "../../../scss/commons/variables";

      sd-progress {
        position: relative;
        display: block;
        width: 100%;
        white-space: nowrap;
        background-color: var(--sd-bg-gray-subtle);
        border: 1px solid var(--sd-bd-hairline);
        border-radius: var(--sd-radius-default);
        overflow: hidden;

        > ._content {
          position: relative;
          z-index: 2;
          padding: var(--sd-gap-lg) var(--sd-gap-default);
        }

        > ._progress {
          position: absolute;
          z-index: 1;
          top: 0;
          left: 0;
          height: 100%;
        }

        @each $key in variables.$theme-keys {
          &[data-sd-theme="#{$key}"] > ._progress {
            background-color: var(--sd-bg-#{$key}-solid);
          }
        }

        &[data-sd-size="sm"] > ._content {
          padding: var(--sd-gap-xs) var(--sd-gap-default);
        }

        &[data-sd-size="lg"] > ._content {
          padding: var(--sd-gap-default) var(--sd-gap-xl);
        }

        &[data-sd-inset="true"] {
          border-radius: 0;
          border: none;
          background-color: var(--sd-bg-control);
        }
      }
    `,
  ],
})
export class SdProgress {
  inset = input(false, { transform: booleanAttribute });
  size = input<"sm" | "lg">();
  theme = input.required<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >();

  value = input.required<number>();

  _barWidth = computed(() => Math.min(Math.max(this.value() * 100, 0), 100) + "%");
}
