import { type JSX, type ParentComponent, splitProps } from "solid-js";
import { list } from "./list.css";
import { objPick } from "@simplysm/core-common";

/**
 * List 컴포넌트의 props
 * @property inset - true일 경우 테두리 안쪽 여백 스타일 적용
 */
export interface ListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

/**
 * ListItem들을 담는 컨테이너 컴포넌트
 *
 * 트리뷰 스타일 키보드 네비게이션 지원:
 * - `Space`: 현재 항목 토글
 * - `↑`/`↓`: 이전/다음 항목으로 포커스 이동
 * - `Home`/`End`: 첫 번째/마지막 항목으로 포커스 이동
 * - `→`: 닫혀있으면 열기, 열려있으면 첫 번째 자식으로 포커스
 * - `←`: 열려있으면 닫기, 닫혀있으면 부모로 포커스
 *
 * @example
 * ```tsx
 * <List>
 *   <ListItem>항목 1</ListItem>
 *   <ListItem>항목 2</ListItem>
 * </List>
 *
 * <List inset>
 *   <ListItem>인셋 스타일 항목</ListItem>
 * </List>
 * ```
 */
export const List: ParentComponent<ListProps> = (props) => {
  const [local, rest] = splitProps(props, [...list.variants(), "class", "children"]);

  let listRef!: HTMLDivElement;

  const isVisible = (el: Element): boolean => {
    let parent = el.parentElement;
    while (parent && parent !== listRef) {
      if (parent.hasAttribute("data-collapsed")) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  };

  const handleArrowRight = (current: HTMLElement) => {
    const isOpen = current.getAttribute("aria-expanded") === "true";
    const hasChildren = current.hasAttribute("aria-expanded");

    if (!hasChildren) return;

    if (!isOpen) {
      current.click();
    } else {
      const nestedItem = current.parentElement?.querySelector(
        ":scope > [data-collapsed] [data-list-item], :scope > * > [data-list-item]",
      ) as HTMLElement | null;
      nestedItem?.focus();
    }
  };

  const handleArrowLeft = (current: HTMLElement) => {
    const isOpen = current.getAttribute("aria-expanded") === "true";
    const hasChildren = current.hasAttribute("aria-expanded");

    if (hasChildren && isOpen) {
      current.click();
    } else {
      const parentItem = current.parentElement?.parentElement?.closest(
        "[data-list-item]",
      ) as HTMLElement | null;
      parentItem?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const current = e.target as HTMLElement;
    if (!current.hasAttribute("data-list-item")) return;

    const allItems = [
      ...listRef.querySelectorAll('[data-list-item]:not([aria-disabled="true"])'),
    ] as HTMLElement[];
    const visibleItems = allItems.filter((el) => isVisible(el));
    const idx = visibleItems.indexOf(current);

    switch (e.key) {
      case " ":
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        current.click();
        break;
      case "ArrowDown":
        if (idx + 1 < visibleItems.length) {
          e.preventDefault();
          e.stopPropagation();
          visibleItems[idx + 1]?.focus();
        }
        break;
      case "ArrowUp":
        if (idx - 1 >= 0) {
          e.preventDefault();
          e.stopPropagation();
          visibleItems[idx - 1]?.focus();
        }
        break;
      case "Home":
        if (visibleItems.length > 0 && idx !== 0) {
          e.preventDefault();
          e.stopPropagation();
          visibleItems[0]?.focus();
        }
        break;
      case "End":
        if (visibleItems.length > 0 && idx !== visibleItems.length - 1) {
          e.preventDefault();
          e.stopPropagation();
          visibleItems[visibleItems.length - 1]?.focus();
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        e.stopPropagation();
        handleArrowRight(current);
        break;
      case "ArrowLeft":
        e.preventDefault();
        e.stopPropagation();
        handleArrowLeft(current);
        break;
    }
  };

  return (
    <div
      ref={listRef}
      role="tree"
      onKeyDown={handleKeyDown}
      {...rest}
      class={[list(objPick(local, list.variants())), local.class].filter(Boolean).join(" ")}
    >
      {local.children}
    </div>
  );
};
