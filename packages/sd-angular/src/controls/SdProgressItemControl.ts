import {ChangeDetectionStrategy, Component, Input} from "@angular/core";

@Component({
  selector: "sd-progress-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";

    :host {
      display: block;
      float: left;
      overflow: hidden;
      padding: var(--gap-sm) var(--gap-default);


      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] {
          background: var(--theme-#{$key}-default);
          color: var(--text-trans-default);
        }
      }
    }
  `],
  host: {
    "[style.width]": "width",
    "[style.height]": "height",
    "[attr.sd-theme]": "theme",
    "[style.background]": "color"
  }
})
export class SdProgressItemControl {
  @Input() width = "100%";
  @Input() height = "30px";
  @Input() theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";
  @Input() color?: string;
}
