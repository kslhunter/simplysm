import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-label",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";

    :host {
      display: inline-block;
      background: var(--theme-grey-darker);
      color: white;
      padding: 0 var(--gap-sm);
      border-radius: var(--border-radius-default);
      text-indent: 0;

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] {
          background: var(--theme-#{$key}-default);
        }
      }

      &[sd-clickable=true] {
        cursor: pointer;

        &:hover {
          background: var(--theme-grey-dark);

          @each $key, $val in map-get($vars, theme) {
            &[sd-theme=#{$key}] {
              background: var(--theme-#{$key}-dark);
            }
          }
        }
      }
    }
  `]
})
export class SdLabelControl {
  @Input()
  @HostBinding("attr.sd-theme")
  theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";

  @Input()
  @HostBinding("style.background")
  color?: string;

  @Input({transform: coercionBoolean})
  @HostBinding("attr.sd-clickable")
  clickable = false;
}
