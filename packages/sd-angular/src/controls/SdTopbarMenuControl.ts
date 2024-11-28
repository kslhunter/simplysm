import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { useRipple } from "../utils/useRipple";
import { transformBoolean } from "../utils/transforms";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";
      @import "../scss/mixins";

      sd-topbar-menu {
        display: inline-block;
        cursor: pointer;
        transition: background 0.1s linear;
        font-weight: bold;
        padding: var(--gap-sm) var(--gap-default);
        border-radius: var(--border-radius-default);

        &:hover {
          background: var(--theme-grey-lightest);
        }

        @each $key, $val in map-get($vars, theme) {
          &[sd-theme="#{$key}"] {
            color: var(--theme-#{$key}-default);

            /*&:hover {
            background: var(--theme-#{$key}-lightest);
          }*/
          }
        }

        &[disabled="true"] {
          pointer-events: none;
          opacity: 0.5;
        }
      }
    `,
  ],
  template: ` <ng-content></ng-content>`,
  host: {
    "[attr.disabled]": "disabled()",
    "[attr.sd-theme]": "theme()",
  },
})
export class SdTopbarMenuControl {
  disabled = input(false, { transform: transformBoolean });
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">("primary");

  constructor() {
    useRipple(() => !this.disabled());
  }
}
