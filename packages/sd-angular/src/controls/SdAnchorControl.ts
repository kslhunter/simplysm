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
      color: var(--theme-primary-default);

      &:hover {
        color: var(--theme-primary-dark);
        text-decoration: underline;
        //filter: drop-shadow(1px 1px 0 var(--text-trans-lightest));
      }

      &:active {
        color: var(--theme-primary-darker);
      }

      @each $key, $val in map-get($vars, theme) {
        padding-left: var(--gap-xxs);
        padding-right: var(--gap-xxs);
        border-radius: var(--border-radius-default);

        &[sd-theme=#{$key}] {
          color: var(--theme-#{$key}-default);

          &:hover {
            color: var(--theme-#{$key}-dark);
          }
        }
      }

      @media all and (pointer: coarse) {
        @include active-effect(true);

        &:hover {
          color: var(--theme-primary-default);
          text-decoration: none;
        }

        &:active {
          color: var(--theme-primary-default);
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
  @Input() theme?: "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey";
}
