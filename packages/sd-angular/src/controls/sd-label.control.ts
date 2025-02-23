import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/type-tramsforms";

@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../scss/variables";

      sd-label {
        display: inline-block;
        background: var(--theme-grey-darker);
        color: white;
        padding: 0 var(--gap-sm);
        border-radius: var(--border-radius-default);
        text-indent: 0;

        @each $key, $val in map.get(variables.$vars, theme) {
          &[sd-theme="#{$key}"] {
            background: var(--theme-#{$key}-default);
          }
        }

        &[sd-clickable="true"] {
          cursor: pointer;

          &:hover {
            background: var(--theme-grey-dark);

            @each $key, $val in map.get(variables.$vars, theme) {
              &[sd-theme="#{$key}"] {
                background: var(--theme-#{$key}-dark);
              }
            }
          }
        }
      }
    `,
  ],
  template: ` <ng-content></ng-content>`,
  host: {
    "[attr.sd-theme]": "theme()",
    "[style.background]": "color()",
    "[attr.sd-clickable]": "clickable()",
  },
})
export class SdLabelControl {
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();
  color = input<string>();
  clickable = input(false, { transform: transformBoolean });
}
