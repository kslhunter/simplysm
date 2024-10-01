import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $hostBinding } from "../utils/$hostBinding";

@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
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
  template: ` <ng-content></ng-content>`,
})
export class SdLabelControl {
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();
  color = input<string>();
  clickable = input(false);

  constructor() {
    $hostBinding("attr.sd-theme", this.theme);
    $hostBinding("style.background", this.color);
    $hostBinding("attr.sd-clickable", this.clickable);
  }
}
