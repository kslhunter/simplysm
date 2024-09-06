import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from "@angular/core";
import { coercionBoolean } from "../utils/commons";

@Component({
  selector: "sd-topbar-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: ` <ng-content></ng-content>`,
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";
      @import "../scss/mixins";

      sd-topbar-menu {
        display: inline-block;
        cursor: pointer;
        @include active-effect(true);
        transition: background 0.1s linear;
        font-weight: bold;

        body.sd-theme-compact &,
        body.sd-theme-modern &,
        body.sd-theme-kiosk & {
          padding: var(--gap-sm) var(--gap-default);
          border-radius: var(--border-radius-default);

          &:hover {
            background: var(--theme-grey-lightest);
          }
        }

        body.sd-theme-mobile & {
          line-height: var(--line-height);
          padding: var(--gap-default) var(--gap-lg);
        }

        @each $key, $val in map-get($vars, theme) {
          &[sd-theme="#{$key}"] {
            color: var(--theme-#{$key}-default);

            body.sd-theme-compact &,
            body.sd-theme-modern &,
            body.sd-theme-kiosk & {
              color: var(--theme-#{$key}-default);

              /*&:hover {
              background: var(--theme-#{$key}-lightest);
            }*/
            }
          }
        }

        &[disabled="true"] {
          pointer-events: none;
          opacity: 0.5;
          @include active-effect(false);
        }
      }
    `,
  ],
  host: {
    "[attr.disabled]": "disabled",
    "[attr.sd-theme]": "theme",
  },
})
export class SdTopbarMenuControl {
  @Input({ transform: coercionBoolean }) disabled = false;
  @Input() theme: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey" =
    "primary";
}
