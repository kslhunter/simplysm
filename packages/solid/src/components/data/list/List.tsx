import { type JSX, type ParentComponent, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { ListContext, useListContext } from "./ListContext";
import { ListItem } from "./ListItem";

const baseClass = clsx("inline-flex flex-col rounded-md");

const rootClass = clsx(
  "border border-base-300 bg-base-50 p-px dark:border-base-700 dark:bg-base-900",
);

const nestedClass = clsx("rounded-none py-1");

const insetClass = clsx(
  "w-full border-transparent bg-transparent dark:border-transparent dark:bg-transparent",
);

export interface ListProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * 투명 배경 스타일 적용
   */
  inset?: boolean;
}

/**
 * ListItem들을 담는 컨테이너 컴포넌트
 *
 * 트리뷰 스타일 키보드 네비게이션 지원:
 * - `Space`/`Enter`: 현재 항목 토글
 * - `ArrowUp`/`ArrowDown`: 이전/다음 항목으로 포커스 이동
 * - `Home`/`End`: 첫 번째/마지막 항목으로 포커스 이동
 * - `ArrowRight`: 닫혀있으면 열기, 열려있으면 첫 번째 자식으로 포커스
 * - `ArrowLeft`: 열려있으면 닫기, 닫혀있으면 부모로 포커스
 *
 * @example
 * ```tsx
 * <List>
 *   <List.Item>Item 1</List.Item>
 *   <List.Item>Item 2</List.Item>
 * </List>
 *
 * <List inset>
 *   <List.Item>Inset style item</List.Item>
 * </List>
 * ```
 */
interface ListComponent extends ParentComponent<ListProps> {
  Item: typeof ListItem;
}

const ListBase: ParentComponent<ListProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "inset"]);

  let listRef!: HTMLDivElement;

  const parentContext = useListContext();
  const currentLevel = parentContext.level + 1;
  const isNested = currentLevel > 1;

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
      // button의 다음 형제 요소(Collapse) 내에서 첫 번째 자식 항목 찾기
      const collapse = current.nextElementSibling;
      const nestedItem = collapse?.querySelector<HTMLElement>("[data-list-item]");
      nestedItem?.focus();
    }
  };

  const handleArrowLeft = (current: HTMLElement) => {
    const isOpen = current.getAttribute("aria-expanded") === "true";
    const hasChildren = current.hasAttribute("aria-expanded");

    if (hasChildren && isOpen) {
      current.click();
    } else {
      // Collapse의 이전 형제가 부모 button
      const parentItem = current.closest("[data-collapse]")
        ?.previousElementSibling as HTMLElement | null;
      if (parentItem?.hasAttribute("data-list-item")) {
        parentItem.focus();
      }
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

  const getClassName = () =>
    twMerge(
      baseClass,
      !isNested && rootClass,
      (local.inset || isNested) && insetClass,
      isNested && nestedClass,
      local.class,
    );

  return (
    <ListContext.Provider value={{ level: currentLevel }}>
      <div
        ref={listRef}
        role={isNested ? "group" : "tree"}
        data-list
        {...rest}
        onKeyDown={(e) => {
          handleKeyDown(e);
          if (typeof rest.onKeyDown === "function") rest.onKeyDown(e);
        }}
        class={getClassName()}
      >
        {local.children}
      </div>
    </ListContext.Provider>
  );
};

export const List = ListBase as ListComponent;
List.Item = ListItem;
