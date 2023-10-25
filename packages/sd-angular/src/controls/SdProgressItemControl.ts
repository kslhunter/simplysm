import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";

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
  `]
})
export class SdProgressItemControl {
  @Input()
  @HostBinding("style.width")
  width = "100%";

  @Input()
  @HostBinding("style.height")
  height = "30px";

  @Input()
  @HostBinding("attr.sd-theme")
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";

  @Input()
  @HostBinding("style.background")
  color?: string;
}
