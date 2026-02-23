import {
  children,
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  type ParentComponent,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconChevronDown } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { Dropdown } from "../../disclosure/Dropdown";
import { List } from "../../data/list/List";
import { SelectContext, type SelectContextValue } from "./SelectContext";
import { useSelectContext } from "./SelectContext";
import { SelectItem } from "./SelectItem";
import { ripple } from "../../../directives/ripple";
import {
  borderDefault,
  borderSubtle,
  type ComponentSize,
  textMuted,
  textPlaceholder,
} from "../../../styles/tokens.styles";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createSlotSignal } from "../../../hooks/createSlotSignal";
import { chevronWrapperClass, getTriggerClass } from "../DropdownTrigger.styles";
import { Invalid } from "../Invalid";

void ripple;

// Select 전용 스타일
const multiTagClass = clsx("rounded", "bg-base-200 px-1", "dark:bg-base-600");
const selectedValueClass = clsx("flex-1", "whitespace-nowrap");

// 검색 입력 스타일
const searchInputClass = clsx(
  "w-full",
  "border-b",
  borderSubtle,
  "bg-transparent",
  "px-2 py-1.5",
  "text-sm",
  "outline-none",
  textPlaceholder,
);

// 전체선택/해제 버튼 영역 스타일
const selectAllBarClass = clsx("flex gap-2", "border-b", borderSubtle, "px-2 py-1", "text-xs");

// 전체선택/해제 버튼 스타일
const selectAllBtnClass = clsx(
  "text-primary-500",
  "hover:text-primary-600 dark:hover:text-primary-400",
  "cursor-pointer",
);

/**
 * Select 우측 액션 서브 컴포넌트
 */
interface SelectActionProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectAction: ParentComponent<SelectActionProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);
  const ctx = useSelectContext();

  ctx.setAction(() => (
    <button
      {...rest}
      type="button"
      data-select-action
      use:ripple
      class={twMerge(
        clsx(
          "border",
          borderDefault,
          "px-1.5",
          "font-bold text-primary-500",
          "hover:bg-base-100 dark:hover:bg-base-700",
          "group-focus-within:border-y-primary-400",
          "last:group-focus-within:border-r-primary-400",
          "dark:group-focus-within:border-y-primary-400",
          "dark:last:group-focus-within:border-r-primary-400",
          "focus:relative focus:z-10 focus:border-primary-400",
          "dark:focus:border-primary-400",
        ),
        local.class,
      )}
    >
      {local.children}
    </button>
  ));
  onCleanup(() => ctx.setAction(undefined));
  return null;
};

/**
 * 드롭다운 상단 커스텀 영역 서브 컴포넌트
 */
const SelectHeader: ParentComponent = (props) => {
  const ctx = useSelectContext();
  // eslint-disable-next-line solid/reactivity -- 슬롯 accessor로 저장, JSX tracked scope에서 호출됨
  ctx.setHeader(() => props.children);
  onCleanup(() => ctx.setHeader(undefined));
  return null;
};

const SelectItemTemplate = <TArgs extends unknown[]>(props: {
  children: (...args: TArgs) => JSX.Element;
}) => {
  const ctx = useSelectContext();
  // eslint-disable-next-line solid/reactivity -- 렌더 함수를 signal에 저장, JSX tracked scope에서 호출됨
  ctx.setItemTemplate(props.children as (...args: unknown[]) => JSX.Element);
  onCleanup(() => ctx.setItemTemplate(undefined));
  return null;
};

// Props 정의

// 공통 Props (value, onValueChange, multiple 제외)
interface SelectCommonProps<TValue = unknown> {
  /** 비활성화 */
  disabled?: boolean;

  /** 필수 입력 */
  required?: boolean;

  /** 미선택 시 표시 텍스트 */
  placeholder?: string;

  /** 트리거 크기 */
  size?: ComponentSize;

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 커스텀 유효성 검사 함수 */
  validate?: (value: unknown) => string | undefined;

  /** touchMode: 포커스 해제 후에만 에러 표시 */
  touchMode?: boolean;

  /** 검색 텍스트 추출 함수 (설정 시 검색 입력 자동 표시) */
  getSearchText?: (item: TValue) => string;

  /** 숨김 여부 판별 함수 */
  getIsHidden?: (item: TValue) => boolean;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

// 단일 선택 Props
interface SelectSingleBaseProps<TValue> extends SelectCommonProps<TValue> {
  /** 다중 선택 모드 */
  multiple?: false;

  /** 현재 선택된 값 */
  value?: TValue;

  /** 값 변경 콜백 */
  onValueChange?: (value: TValue) => void;

  /** 다중 선택 시 표시 방향 (단일 선택에서는 사용 안 함) */
  multiDisplayDirection?: never;

  /** 전체 선택 버튼 숨기기 (단일 선택에서는 사용 안 함) */
  hideSelectAll?: never;
}

// 다중 선택 Props
interface SelectMultipleBaseProps<TValue> extends SelectCommonProps<TValue> {
  /** 다중 선택 모드 */
  multiple: true;

  /** 현재 선택된 값 */
  value?: TValue[];

  /** 값 변경 콜백 */
  onValueChange?: (value: TValue[]) => void;

  /** 다중 선택 시 표시 방향 */
  multiDisplayDirection?: "horizontal" | "vertical";

  /** 전체 선택 버튼 숨기기 */
  hideSelectAll?: boolean;
}

// items 방식
interface SelectWithItemsPropsBase<TValue> {
  items: TValue[];
  getChildren?: (item: TValue, index: number, depth: number) => TValue[] | undefined;
  renderValue?: (value: TValue) => JSX.Element;
  children?: JSX.Element;
}

// children 방식
interface SelectWithChildrenPropsBase<TValue> {
  items?: never;
  getChildren?: never;
  renderValue: (value: TValue) => JSX.Element;
  children: JSX.Element;
}

export type SelectProps<TValue = unknown> =
  | (SelectSingleBaseProps<TValue> & SelectWithItemsPropsBase<TValue>)
  | (SelectSingleBaseProps<TValue> & SelectWithChildrenPropsBase<TValue>)
  | (SelectMultipleBaseProps<TValue> & SelectWithItemsPropsBase<TValue>)
  | (SelectMultipleBaseProps<TValue> & SelectWithChildrenPropsBase<TValue>);

interface SelectComponent {
  <TValue = unknown>(props: SelectProps<TValue>): JSX.Element;
  Item: typeof SelectItem;
  Action: typeof SelectAction;
  Header: typeof SelectHeader;
  ItemTemplate: typeof SelectItemTemplate;
}

/**
 * Select 컴포넌트
 *
 * @example
 * ```tsx
 * // children 방식
 * <Select value={selected()} onValueChange={setSelected} renderValue={(v) => v.name}>
 *   <Select.Item value={item1}>{item1.name}</Select.Item>
 *   <Select.Item value={item2}>{item2.name}</Select.Item>
 * </Select>
 *
 * // items prop 방식
 * <Select items={data} value={selected()} onValueChange={setSelected}>
 *   <Select.ItemTemplate>
 *     {(item) => <>{item.name}</>}
 *   </Select.ItemTemplate>
 * </Select>
 * ```
 */
export const Select: SelectComponent = <T,>(props: SelectProps<T>) => {
  const [local, rest] = splitProps(props as SelectProps<T> & { children?: JSX.Element }, [
    "children",
    "class",
    "style",
    "value",
    "onValueChange",
    "multiple",
    "disabled",
    "required",
    "placeholder",
    "size",
    "inset",
    "multiDisplayDirection",
    "hideSelectAll",
    "items",
    "getChildren",
    "renderValue",
    "validate",
    "touchMode",
    "getSearchText",
    "getIsHidden",
  ]);

  const [open, setOpen] = createSignal(false);

  // 검색 텍스트 signal
  const [searchText, setSearchText] = createSignal("");

  // open → false 시 searchText 초기화
  createEffect(() => {
    if (!open()) {
      setSearchText("");
    }
  });

  // 선택된 값 관리 (controlled/uncontrolled 패턴)
  type ValueType = T | T[] | undefined;
  const [value, setValue] = createControllableSignal<ValueType>({
    value: () => local.value,
    onChange: () => local.onValueChange as ((v: ValueType) => void) | undefined,
  } as Parameters<typeof createControllableSignal<ValueType>>[0]);

  // 값이 선택되어 있는지 확인
  const isSelected = (itemValue: T): boolean => {
    const current = value();
    if (current === undefined) return false;

    if (local.multiple) {
      return Array.isArray(current) && current.includes(itemValue);
    }
    return current === itemValue;
  };

  // 값 토글
  const toggleValue = (itemValue: T) => {
    if (local.multiple) {
      const current = (value() as T[] | undefined) ?? [];
      const idx = current.indexOf(itemValue);
      if (idx >= 0) {
        setValue([...current.slice(0, idx), ...current.slice(idx + 1)] as T[]);
      } else {
        setValue([...current, itemValue] as T[]);
      }
    } else {
      setValue(itemValue);
    }
  };

  // 드롭다운 닫기
  const closeDropdown = () => {
    setOpen(false);
  };

  // 슬롯 signals
  const [header, setHeader] = createSlotSignal();
  const [action, setAction] = createSlotSignal();
  const [itemTemplate, _setItemTemplate] = createSignal<
    ((...args: unknown[]) => JSX.Element) | undefined
  >();
  const setItemTemplate = (fn: ((...args: unknown[]) => JSX.Element) | undefined) =>
    _setItemTemplate(() => fn);

  // Context 값
  const contextValue: SelectContextValue<T> = {
    multiple: () => local.multiple ?? false,
    isSelected,
    toggleValue,
    closeDropdown,
    setHeader,
    setAction,
    setItemTemplate,
  };

  // 트리거 키보드 처리 (Enter/Space만 처리, ArrowUp/Down은 Dropdown이 처리)
  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    if (local.disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  // 유효성 검사 메시지
  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && (v === undefined || v === null || v === ""))
      return "필수 입력 항목입니다";
    return local.validate?.(v);
  });

  // 트리거 클래스
  const getTriggerClassName = () =>
    getTriggerClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      class: local.class,
    });

  // 검색 필터링 (계층 구조 지원)
  const filteredItems = createMemo((): T[] | undefined => {
    if (!local.items) return undefined;
    if (!local.getSearchText || !searchText()) return local.items;

    const terms = searchText().trim().split(" ").filter(Boolean);
    if (terms.length === 0) return local.items;

    // 계층 구조에서 자식 매칭 시 부모도 포함
    const matchesSearch = (item: T): boolean => {
      const text = local.getSearchText!(item).toLowerCase();
      if (terms.every((t) => text.includes(t.toLowerCase()))) return true;

      // 자식 중 매칭되는 항목이 있으면 부모도 표시
      if (local.getChildren) {
        const itemChildren = local.getChildren(item, 0, 0);
        if (itemChildren?.some((child) => matchesSearch(child))) return true;
      }

      return false;
    };

    return local.items.filter((item) => matchesSearch(item));
  });

  // 숨김 필터링 적용된 items
  const visibleItems = createMemo((): T[] | undefined => {
    const items = filteredItems();
    if (!items || !local.getIsHidden) return items;

    return items.filter((item) => {
      // 숨김 항목이지만 선택된 경우 표시 (취소선으로)
      if (local.getIsHidden!(item)) {
        return isSelected(item);
      }
      return true;
    });
  });

  // 전체선택
  const handleSelectAll = () => {
    const items = visibleItems();
    if (!items) return;
    setValue(items);
  };

  // 전체해제
  const handleDeselectAll = () => {
    setValue([] as unknown as T[]);
  };

  // 내부 컴포넌트: Provider 안에서 children을 resolve하여 슬롯 등록을 트리거
  const SelectInner: ParentComponent = (innerProps) => {
    // children() resolve로 서브 컴포넌트 등록 트리거 (Header, Action, ItemTemplate은 null 반환)
    const resolved = children(() => innerProps.children);

    // itemTemplate 함수 추출
    const getItemTemplate = ():
      | ((item: T, index: number, depth: number) => JSX.Element)
      | undefined => {
      return itemTemplate() as ((item: T, index: number, depth: number) => JSX.Element) | undefined;
    };

    // items 재귀 렌더링
    const renderItems = (itemList: T[], depth: number): JSX.Element => {
      const tpl = getItemTemplate();
      return (
        <For each={itemList}>
          {(item, index) => {
            const hidden = () => local.getIsHidden?.(item) ?? false;
            return (
              <SelectItem value={item} class={hidden() ? "line-through opacity-60" : undefined}>
                {tpl ? tpl(item, index(), depth) : String(item)}
                <Show when={local.getChildren?.(item, index(), depth)} keyed>
                  {(itemChildren) => {
                    // 자식 목록에서 숨김 필터링 적용
                    const visibleChildren = () => {
                      if (!local.getIsHidden) return itemChildren;
                      return itemChildren.filter((child) => {
                        if (local.getIsHidden!(child)) return isSelected(child);
                        return true;
                      });
                    };
                    return (
                      <Show when={visibleChildren().length > 0}>
                        <SelectItem.Children>
                          {renderItems(visibleChildren(), depth + 1)}
                        </SelectItem.Children>
                      </Show>
                    );
                  }}
                </Show>
              </SelectItem>
            );
          }}
        </For>
      );
    };

    // 선택된 값 렌더링 (items 방식일 때 itemTemplate 재사용)
    const renderValue = (renderVal: T): JSX.Element => {
      if (local.renderValue) {
        return local.renderValue(renderVal);
      }
      const tpl = getItemTemplate();
      if (tpl) {
        return tpl(renderVal, 0, 0);
      }
      return <>{String(renderVal)}</>;
    };

    // 선택된 값 표시
    const renderSelectedValue = (): JSX.Element => {
      const current = value();

      if (current === undefined || (Array.isArray(current) && current.length === 0)) {
        return <span class={textMuted}>{local.placeholder ?? ""}</span>;
      }

      if (local.multiple && Array.isArray(current)) {
        const direction = local.multiDisplayDirection ?? "horizontal";
        return (
          <div class={clsx("flex gap-1", direction === "vertical" ? "flex-col" : "flex-wrap")}>
            <For each={current}>{(v) => <span class={multiTagClass}>{renderValue(v)}</span>}</For>
          </div>
        );
      }

      return renderValue(current as T);
    };

    // 미지정 항목 표시 여부: 단일 선택 + required 아님 + items 모드
    const showUnsetItem = () => !local.multiple && !local.required && local.items !== undefined;

    // 전체선택/해제 버튼 표시 여부: multiple + hideSelectAll 아님 + items 모드
    const showSelectAllBar = () =>
      local.multiple === true && !local.hideSelectAll && local.items !== undefined;

    return (
      <div {...rest} data-select class={clsx("group", local.inset ? "flex" : "inline-flex")}>
        <Dropdown disabled={local.disabled} open={open()} onOpenChange={setOpen} keyboardNav>
          <Dropdown.Trigger>
            <div
              use:ripple={!local.disabled}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open()}
              aria-disabled={local.disabled || undefined}
              aria-required={local.required || undefined}
              tabIndex={local.disabled ? -1 : 0}
              class={twMerge(
                getTriggerClassName(),
                action() !== undefined &&
                  clsx(
                    "rounded-r-none border-r-0",
                    "group-focus-within:border-primary-400 dark:group-focus-within:border-primary-400",
                  ),
              )}
              style={local.style}
              onKeyDown={handleTriggerKeyDown}
            >
              <div class={selectedValueClass}>{renderSelectedValue()}</div>
              <div class={chevronWrapperClass}>
                <Icon icon={IconChevronDown} size="1em" />
              </div>
            </div>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Show when={header()}>{header()!()}</Show>
            {/* 검색 입력 */}
            <Show when={local.getSearchText && local.items}>
              <input
                type="text"
                data-select-search
                class={searchInputClass}
                placeholder="검색..."
                value={searchText()}
                onInput={(e) => setSearchText(e.currentTarget.value)}
              />
            </Show>
            {/* 전체선택/해제 버튼 */}
            <Show when={showSelectAllBar()}>
              <div class={selectAllBarClass}>
                <button
                  type="button"
                  data-select-all
                  class={selectAllBtnClass}
                  onClick={handleSelectAll}
                >
                  전체선택
                </button>
                <button
                  type="button"
                  data-deselect-all
                  class={selectAllBtnClass}
                  onClick={handleDeselectAll}
                >
                  전체해제
                </button>
              </div>
            </Show>
            <List inset role="listbox">
              <Show when={local.items} fallback={resolved()}>
                {/* 미지정 항목 */}
                <Show when={showUnsetItem()}>
                  <SelectItem value={undefined as T}>
                    <span class={textMuted}>미지정</span>
                  </SelectItem>
                </Show>
                {renderItems(visibleItems() ?? [], 0)}
              </Show>
            </List>
          </Dropdown.Content>
        </Dropdown>
        <Show when={action()}>
          <div
            class={clsx(
              "contents",
              "[&>[data-select-action]:last-child]:rounded-r",
              "[&>[data-select-action]+[data-select-action]]:-ml-px",
            )}
          >
            {action()!()}
          </div>
        </Show>
      </div>
    );
  };

  return (
    <Invalid message={errorMsg()} variant="border" touchMode={local.touchMode}>
      <SelectContext.Provider value={contextValue as SelectContextValue}>
        <SelectInner>{local.children}</SelectInner>
      </SelectContext.Provider>
    </Invalid>
  );
};

Select.Item = SelectItem;
Select.Action = SelectAction;
Select.Header = SelectHeader;
Select.ItemTemplate = SelectItemTemplate;
