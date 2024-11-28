import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from "@angular/core";
import { transformBoolean } from "../utils/transforms";

/**
 * 리스트 컨트롤
 * 
 * 리스트 형태의 컨텐츠를 표시하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-list>
 *   <sd-list-item>항목 1</sd-list-item>
 *   <sd-list-item>항목 2</sd-list-item>
 * </sd-list>
 * 
 * <!-- 들여쓰기 적용 -->
 * <sd-list [inset]="true">
 *   <sd-list-item>들여쓰기된 항목 1</sd-list-item>
 *   <sd-list-item>들여쓰기된 항목 2</sd-list-item>
 * </sd-list>
 * ```
 */
@Component({
  selector: "sd-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      sd-list {
        display: block;
        user-select: none;
        border-radius: var(--border-radius-default);
        overflow: hidden;
        background: white;
        width: 100%;

        &[sd-inset="true"] {
          border-radius: 0;
          background: transparent;

          sd-list {
            border-radius: 0;
            background: transparent;
          }
        }
      }
    `,
  ],
  template: `
    <ng-content></ng-content>
  `,
  host: {
    "[attr.sd-inset]": "inset()",
  },
})
export class SdListControl {
  inset = input(false, { transform: transformBoolean });
}
