import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdGridControl } from "./SdGridControl";
import { $computed } from "../utils/$hooks";

/**
 * 그리드 아이템 컨트롤
 * 
 * 그리드 내부의 각 아이템을 제어하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <sd-grid gap="sm">
 *   <sd-grid-item [colSpan]="6">
 *     <!-- 6칸을 차지하는 아이템 -->
 *   </sd-grid-item>
 *   <sd-grid-item [colSpan]="6">
 *     <!-- 6칸을 차지하는 아이템 -->
 *   </sd-grid-item>
 *   <sd-grid-item [colSpan]="12" [colSpanSm]="6">
 *     <!-- 기본 12칸, 작은 화면에서 6칸을 차지하는 아이템 -->
 *   </sd-grid-item>
 * </sd-grid>
 * ```
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
