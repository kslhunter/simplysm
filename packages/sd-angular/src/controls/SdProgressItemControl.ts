import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";

@Component({
  selector: "sd-progress-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @import "../scss/variables";

      sd-progress-item {
        display: block;
        float: left;
        overflow: hidden;
        padding: var(--gap-sm) var(--gap-default);

        @each $key, $val in map-get($vars, theme) {
          &[sd-theme="#{$key}"] {
            background: var(--theme-#{$key}-default);
            color: var(--text-trans-default);
          }
        }
      }
    `,
  ],
  template: ` <ng-content></ng-content> `,
  host: {
    "[style.width]": "width()",
    "[style.height]": "height()",
    "[attr.sd-theme]": "theme()",
    "[style.background]": "color()",
  },
})
export class SdProgressItemControl {
  width = input("100%");
  height = input("30px");
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">();
  color = input<string>();
}
