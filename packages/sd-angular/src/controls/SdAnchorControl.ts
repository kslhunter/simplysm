import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/transforms";

/**
 * 앵커 컴포넌트
 * 
 * 클릭 가능한 텍스트 링크를 표시하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-anchor>링크 텍스트</sd-anchor>
 * 
 * <!-- 테마 적용 -->
 * <sd-anchor theme="primary">기본 테마</sd-anchor>
 * <sd-anchor theme="info">정보 테마</sd-anchor>
 * 
 * <!-- 비활성화 -->
 * <sd-anchor [disabled]="true">비활성화된 링크</sd-anchor>
 * ```
 * 
 * @remarks
 * - 클릭 가능한 텍스트 링크를 표시합니다
 * - 다양한 테마 색상을 지원합니다 (primary, info, success 등)
 * - hover 시 밑줄이 표시되고 색상이 진해집니다
 * - disabled 상태를 지원합니다
 * - 터치 디바이스에서는 hover 효과가 적용되지 않습니다
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
  /** 앵커의 비활성화 여부를 지정합니다 */
  disabled = input(false, { transform: transformBoolean });

  /** 앵커의 테마를 지정합니다 (primary, secondary, info, success, warning, danger, grey, blue-grey) */
  theme = input<"primary" | "secondary" | "info" | "success" | "warning" | "danger" | "grey" | "blue-grey">("primary");
}
