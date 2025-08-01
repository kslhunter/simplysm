import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/type-tramsforms";

@Component({
  selector: "sd-note",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../scss/variables";

      sd-note {
        display: block;
        padding: var(--gap-sm) var(--gap-default);
        background: var(--theme-grey-lightest);

        border: none;
        border-radius: var(--border-radius-default);

        @each $key, $val in map.get(variables.$vars, theme) {
          &[sd-theme="#{$key}"] {
            background: var(--theme-#{$key}-lightest);
            border: 1px solid var(--theme-#{$key}-lightest);
          }
        }

        &[sd-size="sm"] {
          font-size: var(--font-size-sm);
          padding: var(--gap-xs) var(--gap-sm);
        }

        &[sd-size="lg"] {
          padding: var(--gap-default) var(--gap-lg);
        }

        &[sd-inset="true"] {
          border-radius: 0;
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content>
  `,
  host: {
    "[attr.sd-theme]": "theme()",
    "[attr.sd-size]": "size()",
    "[attr.sd-inset]": "inset()",
  },
})
export class SdNoteControl {
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();
  size = input<"sm" | "lg">();
  inset = input(false, { transform: transformBoolean });
}
