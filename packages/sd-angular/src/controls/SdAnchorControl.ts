import {ChangeDetectionStrategy, Component, input, ViewEncapsulation} from "@angular/core";

@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  //region styles
  styles: [/* language=SCSS */ `
    @import "../scss/variables";
    @import "../scss/mixins";

    sd-anchor {
      display: inline-block;
      cursor: pointer;

      @each $key, $val in map-get($vars, theme) {
        &[sd-theme="#{$key}"] {
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

      &[disabled="true"] {
        color: var(--theme-grey-light);
        cursor: default;
        pointer-events: none;

        @media all and (pointer: coarse) {
          @include active-effect(false);
        }
      }
    }
  `],
  //endregion
  template: `
    <ng-content></ng-content>
  `,
  host: {
    "[attr.sd-theme]": "theme()",
    "[attr.disabled]": "disabled()",
    "[attr.tabindex]": "disabled() ? undefined : 0",
  },
})
export class SdAnchorControl {
  disabled = input(false);
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">("primary");
}
