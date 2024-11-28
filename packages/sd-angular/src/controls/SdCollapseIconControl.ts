import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from "@angular/core";
import { SdAngularConfigProvider } from "../providers/SdAngularConfigProvider";
import { $computed } from "../utils/$hooks";
import { transformBoolean } from "../utils/transforms";
import { SdIconControl } from "./SdIconControl";


/**
 * 접기/펼치기 아이콘 컨트롤
 * 
 * @example
 * ```html
 * <sd-collapse-icon [open]="isOpen" />
 * ```
 * 
 * @property icon - 표시할 아이콘 (기본값: angleDown)
 * @property open - 펼침 상태 여부 (기본값: false)
 * @property openRotate - 펼침 상태일 때 회전할 각도 (기본값: 90)
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
