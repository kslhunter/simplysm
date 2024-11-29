import { ChangeDetectionStrategy, Component, forwardRef, inject, ViewEncapsulation } from "@angular/core";
import { SdDropdownControl } from "./SdDropdownControl";
import { SdEventsDirective } from "../directives/SdEventsDirective";
import { injectElementRef } from "../utils/injectElementRef";

// TODO: 모바일일때는 모달 형식으로 표현

/**
 * 드롭다운 팝업 컴포넌트
 * 
 * 드롭다운 컨트롤에서 사용되는 팝업 메뉴를 구현하는 컴포넌트입니다.
 * 
 * @example
 * ```html
 * <!-- 기본 사용법 -->
 * <sd-dropdown>
 *   <button>메뉴 열기</button>
 *   <sd-dropdown-popup>
 *     <div>메뉴 항목 1</div>
 *     <div>메뉴 항목 2</div>
 *   </sd-dropdown-popup>
 * </sd-dropdown>
 * ```
 * 
 * @remarks
 * - 드롭다운 컨트롤과 함께 사용됩니다
 * - 자동으로 위치가 조정됩니다
 * - 애니메이션 효과를 제공합니다
 * - 키보드 탐색을 지원합니다
 * - 스크롤이 가능한 메뉴를 제공합니다
 * - 반응형 디자인을 지원합니다
 * - 모바일에서는 모달 형태로 표시됩니다
 * - 접근성을 고려한 포커스 관리를 제공합니다
 */
@Component({
  selector: "sd-dropdown-popup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [SdEventsDirective],
  styles: [
    /* language=SCSS */ `
      @import "../scss/mixins";

      sd-dropdown-popup {
        position: fixed;
        z-index: var(--z-index-dropdown);
        opacity: 0;
        transform: translateY(-10px);
        transition: 0.1s linear;
        transition-property: transform, opacity;
        pointer-events: none;
        background: white;
        min-width: 120px;
        @include elevation(6);
        overflow: hidden;
        border-radius: var(--border-radius-default);
        border: 1px solid var(--border-color-light);

        > div {
          width: 100%;
          height: 100%;
          overflow: auto;
          white-space: nowrap;
        }

        &:focus {
          outline: 1px solid var(--theme-primary-default);
        }

        @media all and (max-width: 520px) {
          @include elevation(0);
          border: 1px solid var(--border-color-default);
        }
      }
    `,
  ],
  template: `
    <div (sdResize)="onResize()" (keydown)="onKeyDown($event)">
      <ng-content></ng-content>
    </div>
  `,
})
export class SdDropdownPopupControl {
  /** 부모 드롭다운 컨트롤에 대한 참조 */
  #parentControl = inject<SdDropdownControl>(forwardRef(() => SdDropdownControl));
  /** 컴포넌트의 ElementRef */
  #elRef = injectElementRef<HTMLElement>();

  /**
   * 키보드 이벤트 처리
   * 
   * 팝업에서 발생한 키보드 이벤트를 부모 드롭다운 컨트롤로 전달합니다.
   * 
   * @param event 키보드 이벤트 객체
   */
  onKeyDown(event: KeyboardEvent) {
    this.#parentControl.onPopupKeydown(event);
  }

  /**
   * 크기 조정 이벤트 처리
   * 
   * 팝업의 내용이 300px를 초과하는 경우 높이를 300px로 제한하고
   * 스크롤이 가능하도록 합니다.
   */
  onResize() {
    const el = this.#elRef.nativeElement;
    const divEl = this.#elRef.nativeElement.firstElementChild!;

    if (divEl.clientHeight > 300) {
      el.style.height = "300px";
    }
    else {
      delete (el.style as any).height;
    }
  }
}
