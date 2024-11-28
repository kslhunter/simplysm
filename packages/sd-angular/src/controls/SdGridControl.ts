import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { injectElementResize } from "../utils/injectElementResize";
import { $computed } from "../utils/$hooks";

/**
 * 그리드 컨트롤
 * 
 * 12열 그리드 시스템을 구현하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-grid gap="sm">
 *   <div>첫 번째 열</div>
 *   <div>두 번째 열</div>
 *   <div>세 번째 열</div>
 * </sd-grid>
 * 
 * <!-- 간격 조절 -->
 * <sd-grid gap="lg">
 *   <div>넓은 간격의 열 1</div>
 *   <div>넓은 간격의 열 2</div>
 * </sd-grid>
 * ```
 */
@Component({
  selector: "sd-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content />
  `,
  styles: [
    /* language=SCSS */ `
      sd-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
      }
    `,
  ],
  host: {
    "[style.gap]": "styleGap()",
  },
})
export class SdGridControl {
  /** 요소의 크기 변경을 감지하는 유틸리티 */
  #size = injectElementResize();

  /** 그리드 셀 간의 간격
   * @type {"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl"} 간격 크기
   */
  gap = input<"xxs" | "xs" | "sm" | "default" | "lg" | "xl" | "xxl">();

  /** 그리드 간격에 대한 CSS 스타일 값을 계산 
   * @returns {string | undefined} CSS 변수로 표현된 간격 값
   */
  styleGap = $computed(() => (this.gap() != null ? "var(--gap-" + this.gap() + ")" : undefined));

  /** 그리드 요소의 너비를 픽셀 단위로 반환
   * @returns {number} 요소의 offsetWidth 값
   */
  offsetWidth = $computed(() => this.#size.offsetWidth());
}
