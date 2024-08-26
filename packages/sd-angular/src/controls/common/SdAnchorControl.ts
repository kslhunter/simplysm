import {ChangeDetectionStrategy, Component, input, ViewEncapsulation} from "@angular/core";
import {coercionBoolean} from "../../utils/commons";

@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../../scss/variables";
    @import "../../scss/mixins";

    sd-anchor {
      display: inline-block;
      cursor: pointer;

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme=#{$key}] {
          color: var(--theme-#{$key}-default);

          &:hover {
            color: var(--theme-#{$key}-darker);
            text-decoration: underline;
          }

          &:active {
            color: var(--theme-#{$key}-default);
          }

          @media all and (pointer: coarse) {
            @include active-effect(true);

            &:hover {
              color: var(--theme-#{$key}-default);
              text-decoration: none;
            }
          }
        }
      }

      &[disabled=true] {
        color: var(--theme-grey-light);
        cursor: default;
        pointer-events: none;

        @media all and (pointer: coarse) {
          @include active-effect(false);
        }
      }
    }
  `],
  host: {
    "[attr.tabindex]": "disabled() ? undefined : 0",
    "[attr.disabled]": "disabled()",
    "[attr.sd-theme]": "theme()",
  }
})
export class SdAnchorControl {
  disabled = input(false, {transform: coercionBoolean});
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">("primary");
}
