import {ChangeDetectionStrategy, Component, Input, ViewEncapsulation} from "@angular/core";
import {coercionBoolean} from "../utils/commons";

@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>`,
  styles: [/* language=SCSS */ `
    @import "../scss/variables";
    @import "../scss/mixins";

    sd-anchor {
      display: inline-block;
      cursor: pointer;

      @each $key, $val in map-get($vars, theme) {
        //padding-left: var(--gap-xxs);
        //padding-right: var(--gap-xxs);
        //border-radius: var(--border-radius-default);

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
    "[attr.tabindex]": "disabled ? undefined : 0",
    "[attr.disabled]": "disabled",
    "[attr.sd-theme]": "theme",
  }
})
export class SdAnchorControl {
  @Input({transform: coercionBoolean}) disabled = false;
  @Input() theme: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey" = "primary";
}
