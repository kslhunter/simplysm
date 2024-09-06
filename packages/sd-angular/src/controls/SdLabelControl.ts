import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from "@angular/core";
import { coercionBoolean } from "../utils/commons";

@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";

      sd-label {
        display: inline-block;
        background: var(--theme-grey-darker);
        color: white;
        padding: 0 var(--gap-sm);
        border-radius: var(--border-radius-default);
        text-indent: 0;

        @each $key, $val in map-get($vars, theme) {
          &[sd-theme="#{$key}"] {
            background: var(--theme-#{$key}-default);
          }
        }

        &[sd-clickable="true"] {
          cursor: pointer;

          &:hover {
            background: var(--theme-grey-dark);

            @each $key, $val in map-get($vars, theme) {
              &[sd-theme="#{$key}"] {
                background: var(--theme-#{$key}-dark);
              }
            }
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-theme]": "theme",
    "[style.background]": "color",
    "[attr.sd-clickable]": "clickable",
  },
})
export class SdLabelControl {
  @Input() theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";
  @Input() color?: string;
  @Input({ transform: coercionBoolean }) clickable = false;
}
