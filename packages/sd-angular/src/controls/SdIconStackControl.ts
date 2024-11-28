import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $computed } from "../utils/$hooks";
import { SizeProp } from "@fortawesome/fontawesome-svg-core";

/**
 * 아이콘 스택 컨트롤
 * 
 * Font Awesome 아이콘을 중첩하여 표시하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-icon-stack>
 *   <sd-icon [icon]="faCircle" stackItemSize="2x"></sd-icon>
 *   <sd-icon [icon]="faFlag" stackItemSize="1x"></sd-icon>
 * </sd-icon-stack>
 * 
 * <!-- 크기 조절 -->
 * <sd-icon-stack size="2x">
 *   <sd-icon [icon]="faSquare" stackItemSize="2x"></sd-icon>
 *   <sd-icon [icon]="faStar" stackItemSize="1x"></sd-icon>
 * </sd-icon-stack>
 * ```
 */
@Component({
  selector: "sd-icon-stack",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  template: `
    <ng-content />
  `,
  host: {
    "[class]": "currentClass()",
  },
})
export class SdIconStackControl {
  /** 아이콘 스택의 크기 (xs, sm, lg, 2x 등) */
  size = input<SizeProp>();

  /** 
   * 현재 적용되어야 할 클래스 목록을 계산
   * - fa-stack: 기본 스택 클래스
   * - fa-{size}: 크기 클래스 (size 값이 있을 때)
   */
  currentClass = $computed(() => [
    "fa-stack",
    this.size() != null ? `fa-${this.size()}` : undefined,
  ].filterExists().join(" "));
}