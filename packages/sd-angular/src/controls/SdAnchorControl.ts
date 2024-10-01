import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $hostBinding } from "../utils/$hostBinding";
import { $computed } from "../utils/$hooks";

@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  //region styles
  styles: [
    /* language=SCSS */ `
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
    `,
  ],
  //endregion
  template: ` <ng-content></ng-content> `,
})
export class SdAnchorControl {
  disabled = input(false);
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">("primary");

  constructor() {
    $hostBinding("attr.sd-theme", this.theme);
    $hostBinding("attr.disabled", this.disabled);
    $hostBinding(
      "attr.tabindex",
      $computed(() => (this.disabled() ? undefined : 0)),
    );
  }
}
