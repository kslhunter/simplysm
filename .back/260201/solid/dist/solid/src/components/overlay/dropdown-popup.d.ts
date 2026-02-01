import "@simplysm/core-common";
import { type JSX, type ParentComponent } from "solid-js";
/**
 * DropdownPopup 컴포넌트의 props
 *
 * JSX.HTMLAttributes<HTMLDivElement>를 확장하여
 * 표준 div 속성을 모두 지원한다.
 */
export interface DropdownPopupProps extends JSX.HTMLAttributes<HTMLDivElement> {
    /**
     * 모바일 모드에서 드래그 핸들 표시 여부
     * @default true
     */
    showHandle?: boolean;
}
/**
 * Dropdown의 팝업 콘텐츠를 렌더링하는 컴포넌트
 *
 * 반드시 Dropdown 컴포넌트 내부에서 사용해야 한다.
 * Portal을 통해 document.body에 렌더링되어 z-index 스태킹 이슈를 방지한다.
 *
 * @example
 * ```tsx
 * <Dropdown>
 *   <button>메뉴 열기</button>
 *   <DropdownPopup>
 *     <div>팝업 내용</div>
 *   </DropdownPopup>
 * </Dropdown>
 * ```
 */
export declare const DropdownPopup: ParentComponent<DropdownPopupProps>;
//# sourceMappingURL=dropdown-popup.d.ts.map