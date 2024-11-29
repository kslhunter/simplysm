import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/transforms";

/**
 * 추가 버튼 컴포넌트
 * 
 * 콘텐츠와 버튼을 함께 표시하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-additional-button>
 *   콘텐츠 영역
 *   <sd-button>추가 버튼</sd-button>
 * </sd-additional-button>
 * 
 * <!-- 작은 크기 -->
 * <sd-additional-button size="sm">
 *   콘텐츠 영역
 *   <sd-button>추가 버튼</sd-button>
 * </sd-additional-button>
 * 
 * <!-- 인셋 스타일 -->
 * <sd-additional-button [inset]="true">
 *   콘텐츠 영역
 *   <sd-button>추가 버튼</sd-button>
 * </sd-additional-button>
 * ```
 * 
 * @remarks
 * - 콘텐츠 영역과 버튼을 수평으로 배치합니다
 * - 콘텐츠 영역은 자동으로 확장되며 스크롤이 가능합니다
 * - 버튼은 오른쪽에 고정되며 왼쪽에 구분선이 표시됩니다
 * - sm 크기와 기본 크기를 지원합니다
 * - inset 스타일을 적용하여 테두리를 제거할 수 있습니다
 */
@Component({
  selector: "sd-additional-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <div>
      <ng-content />
    </div>
    <ng-content select="sd-button" />
  `,
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-additional-button {
        display: flex;
        flex-wrap: nowrap;
        flex-direction: row;
        gap: var(--gap-sm);
        border: 1px solid var(--trans-light);
        border-radius: var(--border-radius-default);
        overflow: hidden;

        > div {
          flex-grow: 1;
          overflow: auto;
          padding: var(--gap-sm) var(--gap-default);
        }

        > sd-button > button {
          border-left: 1px solid var(--trans-light) !important;
          padding: var(--gap-sm) !important;
        }

        &[sd-inset="true"] {
          border-radius: 0;
          border: none;
        }

        &[sd-size="sm"] {
          > div {
            padding: var(--gap-xs) var(--gap-default);
          }

          > sd-button > button {
            padding: var(--gap-xs) !important;
          }
        }

        &[sd-size="lg"] {
          > div {
            padding: var(--gap-default) var(--gap-xl);
          }

          > sd-button > button {
            padding: var(--gap-default) !important;
          }
        }
      }
    `,
  ],
  host: {
    "[attr.sd-size]": "size()",
    "[attr.sd-inset]": "inset()",
  },
})
export class SdAdditionalButtonControl {
  /** 컨트롤의 크기를 지정합니다 (sm: 작게, lg: 크게) */
  size = input<"sm" | "lg">();

  /** 
   * 컨트롤의 inset 여부를 지정합니다
   * 
   * @remarks
   * - true로 설정하면 테두리와 border-radius가 제거됩니다
   * - 다른 컨트롤 내부에 포함될 때 유용합니다
   */
  inset = input(false, { transform: transformBoolean });
}
