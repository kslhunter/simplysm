import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from "@angular/core";

@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  template: `
    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../../../../scss/commons/variables";

      sd-anchor {
        display: inline-block;
        cursor: pointer;

        @each $key, $val in map.get(variables.$vars, theme) {
          &[data-sd-theme="#{$key}"] {
            color: var(--theme-#{$key}-default);

            &:hover {
              color: var(--theme-#{$key}-darker);
              text-decoration: underline;
            }

            &:active {
              color: var(--theme-#{$key}-default);
            }

            @media all and (pointer: coarse) {
              &:hover {
                color: var(--theme-#{$key}-default);
                text-decoration: none;
              }
            }
          }
        }

        &[data-sd-disabled="true"] {
          opacity: 0.3;
          pointer-events: none;
        }
      }
    `,
  ],
  host: {
    "[attr.data-sd-theme]": "theme()",
    "[attr.data-sd-disabled]": "disabled()",
    "[attr.tabindex]": "disabled() ? undefined : 0",
  },
})
export class SdAnchorControl {
  disabled = input(false, { transform: booleanAttribute });
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >("primary");
}
