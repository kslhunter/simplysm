import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/tramsforms";

@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../scss/variables";
      @use "../scss/mixins";

      sd-anchor {
        display: inline-block;
        cursor: pointer;

        @each $key, $val in map.get(variables.$vars, theme) {
          &[sd-theme="#{$key}"] {
            color: var(--theme-#{$key}-default);

            &:hover {
              color: var(--theme-#{$key}-darker);
              text-decoration: underline;
            }

            &:active {
              color: var(--theme-#{$key}-default);
            }

            @media all and (pointer: coarse) {
              &:hover {
                color: var(--theme-#{$key}-default);
                text-decoration: none;
              }
            }
          }
        }

        &[disabled="true"] {
          color: var(--theme-grey-light);
          cursor: default;
          pointer-events: none;
        }
      }
    `,
  ],
  host: {
    "[attr.sd-theme]": "theme()",
    "[attr.disabled]": "disabled()",
    "[attr.tabindex]": "disabled() ? undefined : 0",
  },
})
export class SdAnchorControl {
  disabled = input(false, { transform: transformBoolean });
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">("primary");
}
