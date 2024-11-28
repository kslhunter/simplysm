import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/transforms";

/**
 * 앵커 컨트롤 컴포넌트
 * 
 * @example
 * ```html
 * <sd-anchor>링크 텍스트</sd-anchor>
 * ```
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
        }
      }
    `,
  ],
  host: {
    "[attr.sd-theme]": "theme()",
    "[attr.disabled]": "disabled()",
    "[attr.tabindex]": "disabled() ? undefined : 0",
  },
})
export class SdAnchorControl {
  /** 비활성화 여부 (기본값: false) */
  disabled = input(false, { transform: transformBoolean });

  /** 
   * 앵커의 테마 색상
   * - primary: 기본 색상
   * - secondary: 보조 색상 
   * - info: 정보 색상
   * - success: 성공 색상
   * - warning: 경고 색상
   * - danger: 위험 색상
   * - grey: 회색
   * - blue-grey: 청회색
   * (기본값: "primary")
   */
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">("primary");
}
