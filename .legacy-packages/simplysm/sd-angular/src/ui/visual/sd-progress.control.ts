import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../core/utils/transforms/transformBoolean";
import { PercentPipe } from "@angular/common";

@Component({
  selector: "sd-progress",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [PercentPipe],
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../../scss/commons/variables";
      @use "../../../scss/commons/mixins";

      sd-progress {
        position: relative;
        display: block;
        width: 100%;
        white-space: nowrap;
        background: var(--theme-gray-lightest);
        border: 1px solid var(--theme-gray-lightest);
        border-radius: var(--border-radius-default);
        overflow: hidden;

        > ._content {
          position: relative;
          z-index: 2;
          padding: var(--gap-lg) var(--gap-default);
        }

        > ._progress {
          position: absolute;
          z-index: 1;
          top: 0;
          right: 0;
          height: 100%;
        }

        @each $key, $val in map.get(variables.$vars, theme) {
          &[theme="#{$key}"] > ._progress {
            background: var(--theme-#{$key}-default);
          }
        }

        &[size="sm"] > ._content {
          padding: var(--gap-xs) var(--gap-default);
        }

        &[size="lg"] > ._content {
          padding: var(--gap-default) var(--gap-xl);
        }

        &[inset=""],
        &[inset="true"] {
          border-radius: 0;
          border: none;
          background: var(--control-color);
        }
      }
    `,
  ],
  template: `
    <div class="_content tx-right">
      {{ value() | percent: "1.0-2" }}
    </div>
    <div class="_progress" [style.width]="value() * 100 + '%'"></div>
  `,
})
export class SdProgressControl {
  inset = input(false, { transform: transformBoolean });
  size = input<"sm" | "lg">();
  theme = input.required<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >();

  value = input.required<number>();
}
