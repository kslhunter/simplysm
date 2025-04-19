import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/type-tramsforms";

/**
 * 앵커 컨트롤 컴포넌트
 * 클릭 가능한 앵커 링크를 표시하는 컴포넌트
 */
@Component({
  selector: "sd-anchor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content></ng-content>
  `,
  styles: [
    /* language=SCSS */ `
      @use "sass:map";

      @use "../scss/variables";
      @use "../scss/mixins";

      sd-anchor {
        display: inline-block;
        cursor: pointer;

        @each $key, $val in map.get(variables.$vars, theme) {
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
              &:hover {
                color: var(--theme-#{$key}-default);
                text-decoration: none;
              }
            }
          }
        }

        &[sd-disabled="true"] {
          color: var(--theme-grey-light);
          cursor: default;
          pointer-events: none;
        }
      }
    `,
  ],
  host: {
    "[attr.sd-theme]": "theme()",
    "[attr.sd-disabled]": "disabled()",
    "[attr.tabindex]": "disabled() ? undefined : 0",
  },
})
export class SdAnchorControl {
  /** 비활성화 여부 */
  disabled = input(false, { transform: transformBoolean });

  /** 테마 - 컴포넌트의 색상 테마를 설정 */
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">(
    "primary");
}