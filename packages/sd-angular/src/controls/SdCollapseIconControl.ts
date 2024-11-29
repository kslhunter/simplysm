import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { $computed } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";
import { SdIconControl } from "./SdIconControl";

/**
 * 접기/펼치기 아이콘 컴포넌트
 * 
 * 콘텐츠의 접기/펼치기 상태를 나타내는 회전 가능한 아이콘을 제공하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-collapse-icon [(open)]="isOpen"></sd-collapse-icon>
 * 
 * <!-- 다른 아이콘 사용 -->
 * <sd-collapse-icon [icon]="'chevronDown'" [(open)]="isOpen"></sd-collapse-icon>
 * 
 * <!-- 회전 각도 변경 -->
 * <sd-collapse-icon [openRotate]="180" [(open)]="isOpen"></sd-collapse-icon>
 * ```
 * 
 * @remarks
 * - 펼침 상태에 따라 자동으로 회전하는 아이콘을 제공합니다
 * - 기본적으로 90도 회전하며, 회전 각도를 사용자 정의할 수 있습니다
 * - 부드러운 회전 애니메이션 효과를 포함합니다
 * - 다양한 아이콘을 지원합니다
 * - 고정된 너비로 정렬을 유지합니다
 */
@Component({
  selector: "sd-collapse-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    SdIconControl
  ],
  styles: [/* language=SCSS */ `
    sd-collapse-icon {
      display: inline-block;
      transition: transform 0.1s ease-in;

      &[sd-open="true"] {
        transition: transform 0.1s ease-out;
      }
    }
  `
  ],
  template: `
    <sd-icon [icon]="icon()" fixedWidth />
  `,
  host: {
    "[attr.sd-open]": "open()",
    "[style.transform]": "transform()"
  }
})
export class SdCollapseIconControl {
  /** 아이콘 설정 제공자 */
  icons = inject(SdAngularConfigProvider).icons;

  /** 표시할 아이콘 (기본값: angleDown) */
  icon = input(this.icons.angleDown);

  /** 펼침 상태 여부 (기본값: false) */
  open = input(false, { transform: transformBoolean });

  /** 펼침 상태일 때 회전할 각도 (기본값: 90) */
  openRotate = input(90);

  /** 아이콘 회전 각도 계산 */
  transform = $computed(() => (this.open() ? "rotate(" + this.openRotate() + "deg)" : ""));
}
