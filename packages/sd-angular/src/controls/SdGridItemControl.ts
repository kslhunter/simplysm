import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdGridControl } from "./SdGridControl";
import { $computed } from "../utils/$hooks";

/**
 * 그리드 아이템 컴포넌트
 * 
 * 그리드 컴포넌트(sd-grid) 내부에서 사용되는 그리드 아이템 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <sd-grid>
 *   <sd-grid-item [colSpan]="6">
 *     절반 너비 아이템
 *   </sd-grid-item>
 *   <sd-grid-item [colSpan]="3" [colSpanSm]="6">
 *     작은 화면에서 절반, 큰 화면에서 1/4 너비 아이템
 *   </sd-grid-item>
 * </sd-grid>
 * ```
 * 
 * @remarks
 * - 12열 그리드 시스템을 사용합니다
 * - 반응형 레이아웃을 지원합니다
 * - 화면 크기별로 다른 열 너비를 지정할 수 있습니다
 *   - 기본: 1280px 이상
 *   - sm: 1024px ~ 1280px
 *   - xs: 800px ~ 1024px 
 *   - xxs: 800px 미만
 */
@Component({
  selector: "sd-grid-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-grid-item {
        height: 100%;
      }
    `
  ],
  template: `
    <ng-content /> `,
  host: {
    "[style.gridColumnEnd]": "styleGridColumnEnd()"
  }
})
export class SdGridItemControl {
  /** 부모 그리드 컨트롤에 대한 참조 */
  #parentControl = inject(SdGridControl);

  /** 기본 열 너비 (1-12 사이의 값) */
  colSpan = input.required<number>();
  /** 작은 화면(1280px 미만)에서의 열 너비 */
  colSpanSm = input<number>();
  /** 더 작은 화면(1024px 미만)에서의 열 너비 */
  colSpanXs = input<number>();
  /** 매우 작은 화면(800px 미만)에서의 열 너비 */
  colSpanXxs = input<number>();

  /** 
   * 화면 크기에 따른 그리드 열 너비를 계산
   * @returns {string} 계산된 grid-column-end CSS 값
   */
  styleGridColumnEnd = $computed(() => {
    const parentWidth = this.#parentControl.offsetWidth();
    if (parentWidth < 800) {
      return `span ${this.colSpanXxs() ?? this.colSpanXs() ?? this.colSpanSm() ?? this.colSpan()}`;
    }
    else if (parentWidth < 1024) {
      return `span ${this.colSpanXs() ?? this.colSpanSm() ?? this.colSpan()}`;
    }
    else if (parentWidth < 1280) {
      return `span ${this.colSpanSm() ?? this.colSpan()}`;
    }
    else {
      return `span ${this.colSpan()}`;
    }
  });
}
