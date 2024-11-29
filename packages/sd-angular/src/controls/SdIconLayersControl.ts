import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { $computed } from "../utils/$hooks";
import { SizeProp } from "@fortawesome/fontawesome-svg-core";
import { transformBoolean } from "../utils/transforms";

/**
 * 아이콘 레이어 컴포넌트
 * 
 * 여러 개의 아이콘을 겹쳐서 표시할 수 있는 레이어 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-icon-layers>
 *   <sd-icon [icon]="faCircle"></sd-icon>
 *   <sd-icon [icon]="faCheck"></sd-icon>
 * </sd-icon-layers>
 * 
 * <!-- 크기 조절 -->
 * <sd-icon-layers size="2x">
 *   <sd-icon [icon]="faCircle"></sd-icon>
 *   <sd-icon [icon]="faHeart" stackItemSize="1x"></sd-icon>
 * </sd-icon-layers>
 * 
 * <!-- 고정 너비 -->
 * <sd-icon-layers [fixedWidth]="true">
 *   <sd-icon [icon]="faSquare"></sd-icon>
 *   <sd-icon [icon]="faStar" stackItemSize="1x"></sd-icon>
 * </sd-icon-layers>
 * ```
 * 
 * @remarks
 * - Font Awesome의 레이어 기능을 사용하여 아이콘을 겹쳐 표시합니다
 * - 내부 아이콘의 크기는 stackItemSize로 조절할 수 있습니다
 * - 전체 레이어의 크기는 size 속성으로 조절할 수 있습니다
 * - 고정 너비 설정이 가능합니다
 */
@Component({
  selector: "sd-icon-layers",
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
export class SdIconLayersControl {
  /** 아이콘 레이어의 크기 (xs, sm, lg, 2x 등) */
  size = input<SizeProp>();

  /** 고정 너비 사용 여부 */
  fixedWidth = input(false, { transform: transformBoolean });

  /** 
   * 현재 적용되어야 할 클래스 목록을 계산
   * - fa-layers: 기본 레이어 클래스
   * - fa-{size}: 크기 클래스 (size 값이 있을 때)
   * - fa-fw: 고정 너비 클래스 (fixedWidth가 true일 때)
   */
  currentClass = $computed(() => [
    "fa-layers",
    this.size() != null ? `fa-${this.size()}` : undefined,
    this.fixedWidth() ? `fa-fw` : undefined,
  ].filterExists().join(" "));
}