import { ChangeDetectionStrategy, Component, ViewEncapsulation } from "@angular/core";
import { useRipple } from "../utils/useRipple";

/**
 * 선택 버튼 컴포넌트
 * 
 * 클릭 가능한 선택 버튼을 표시하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <sd-select-button>
 *   선택하기
 * </sd-select-button>
 * ```
 * 
 * @remarks
 * - 리플 효과가 자동으로 적용됩니다
 * - 호버 시 배경색이 변경됩니다
 * - 기본 테마 색상을 사용합니다
 */
@Component({
  selector: "sd-select-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-select-button {
        display: block;
        background: white;
        font-weight: bold;
        cursor: pointer;
        color: var(--theme-primary-default);

        transition: background 0.1s linear;

        &:hover {
          color: var(--theme-primary-darker);
          background: var(--theme-grey-lightest);
        }
      }
    `,
  ],
  template: ` <ng-content></ng-content> `,
})
export class SdSelectButtonControl {
  constructor() {
    useRipple();
  }
}
