import "@simplysm/core-common";
import {
  type JSX,
  type ParentComponent,
  Show,
  splitProps,
  createMemo,
  createEffect,
  onCleanup,
} from "solid-js";
import { Portal } from "solid-js/web";
import { tabbable } from "tabbable";
import { backdrop, dropdownPopup, dropdownPopupContent, mobileHandle } from "./dropdown-popup.css";
import { useDropdownInternal } from "./dropdown-context";

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
export const DropdownPopup: ParentComponent<DropdownPopupProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "style", "showHandle"]);

  const ctx = useDropdownInternal();
  if (!ctx) {
    throw new Error(
      "[DropdownPopup] Dropdown 컴포넌트 내부에서 사용해야 합니다.\n" +
        "DropdownPopup은 반드시 <Dropdown> 컴포넌트의 자식으로 배치해야 합니다.",
    );
  }

  const showHandle = createMemo(() => local.showHandle ?? true);

  let popupRef!: HTMLDivElement;

  // 팝업 열릴 때 스타일 적용 및 포커스
  createEffect(() => {
    if (ctx.open()) {
      // 다음 프레임에서 포지션 적용 (DOM이 렌더링된 후)
      const frameId = requestAnimationFrame(() => {
        const style = ctx.popupStyle();
        Object.entries(style).forEach(([key, value]) => {
          if (value !== undefined) {
            popupRef.style.setProperty(key, String(value));
          }
        });
        popupRef.focus();
      });
      onCleanup(() => cancelAnimationFrame(frameId));
    }
  });

  // 키보드 이벤트
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      ctx.close();
      return;
    }

    // 경계 focusable에서 trigger로 포커스 이동
    // placement="bottom": 첫번째 + ArrowUp → trigger
    // placement="top": 마지막 + ArrowDown → trigger
    if (!e.ctrlKey && !e.altKey) {
      const tabbables = tabbable(popupRef);
      const shouldFocusTrigger =
        (ctx.placement() === "bottom" &&
          e.key === "ArrowUp" &&
          document.activeElement === tabbables[0]) ||
        (ctx.placement() === "top" &&
          e.key === "ArrowDown" &&
          document.activeElement === tabbables.at(-1));

      if (shouldFocusTrigger) {
        e.preventDefault();
        e.stopPropagation();
        ctx.focusTrigger();
      }
    }
  };

  return (
    <Show when={ctx.open()}>
      <Portal>
        {/* 모바일 백드롭 */}
        <Show when={ctx.isMobile()}>
          <div class={backdrop} onClick={() => ctx.close()} />
        </Show>

        {/* 팝업 본체 */}
        <div
          ref={popupRef}
          id={`dropdown-popup-${ctx.id}`}
          data-dropdown-id={ctx.id}
          role="menu"
          tabIndex={-1}
          class={[
            dropdownPopup({
              placement: ctx.placement(),
              mobile: ctx.isMobile(),
            }),
            local.class,
          ]
            .filter(Boolean)
            .join(" ")}
          style={local.style}
          onKeyDown={handleKeyDown}
          {...rest}
        >
          {/* 모바일 드래그 핸들 */}
          <Show when={ctx.isMobile() && showHandle()}>
            <div class={mobileHandle} />
          </Show>

          <div class={dropdownPopupContent}>{local.children}</div>
        </div>
      </Portal>
    </Show>
  );
};
