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
      @use "../../../scss/commons/variables";

      sd-anchor {
        display: inline-block;
        cursor: pointer;

        @each $key in variables.$theme-keys {
          &[data-sd-theme="#{$key}"] {
            color: var(--sd-tx-#{$key});

            &:hover {
              color: var(--sd-tx-#{$key}-hover);
              text-decoration: underline;
            }

            &:active {
              color: var(--sd-tx-#{$key});
            }

            @media all and (pointer: coarse) {
              &:hover {
                color: var(--sd-tx-#{$key});
                text-decoration: none;
              }
            }
          }
        }

        // disabled 는 색 치환 단일 규약 (DEC-009 — opacity 방식 폐기)
        &[data-sd-disabled="true"] {
          color: var(--sd-tx-disabled) !important;
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
export class SdAnchor {
  disabled = input(false, { transform: booleanAttribute });
  theme = input<
    "primary" | "secondary" | "info" | "success" | "warning" | "danger" | "gray" | "blue-gray"
  >("primary");
}
