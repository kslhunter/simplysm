import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../../core/utils/transforms/transformBoolean";

@Component({
  selector: "sd-note",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  host: {
    "[attr.data-sd-theme]": "theme()",
    "[attr.data-sd-size]": "size()",
    "[attr.data-sd-inset]": "inset()",
  },
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../../scss/commons/variables";

      sd-note {
        display: block;
        padding: var(--gap-sm) var(--gap-default);
        background: var(--theme-gray-lightest);

        border: none;
        border-radius: var(--border-radius-default);

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$key}"] {
            background: var(--theme-#{$key}-lightest);
            border: 1px solid var(--theme-#{$key}-lightest);
          }
        }

        &[data-sd-size="sm"] {
          font-size: var(--font-size-sm);
          padding: var(--gap-xs) var(--gap-sm);
        }

        &[data-sd-size="lg"] {
          padding: var(--gap-default) var(--gap-lg);
        }

        &[data-sd-inset="true"] {
          border-radius: 0;
        }
      }
    `,
  ],
})
export class SdNoteControl {
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >();
  size = input<"sm" | "lg">();
  inset = input(false, { transform: transformBoolean });
}
