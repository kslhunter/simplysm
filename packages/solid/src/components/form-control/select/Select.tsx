import {
  children,
  createMemo,
  createSignal,
  For,
  type JSX,
  type ParentComponent,
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
import { SelectItem } from "./SelectItem";
import { ripple } from "../../../directives/ripple";
import { splitSlots } from "../../../helpers/splitSlots";
import { borderDefault, type ComponentSize, textMuted } from "../../../styles/tokens.styles";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { chevronWrapperClass, getTriggerClass } from "../DropdownTrigger.styles";
import { Invalid } from "../Invalid";

void ripple;

// Select 전용 스타일
const multiTagClass = clsx("rounded", "bg-base-200 px-1", "dark:bg-base-600");
const selectedValueClass = clsx("flex-1", "whitespace-nowrap");

/**
 * Select 우측 액션 서브 컴포넌트
 */
interface SelectActionProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectAction: ParentComponent<SelectActionProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
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
  );
};

/**
 * 드롭다운 상단 커스텀 영역 서브 컴포넌트
 */
const SelectHeader: ParentComponent = (props) => <div data-select-header>{props.children}</div>;

/**
 * items prop 방식일 때 아이템 렌더링 템플릿
 *
 * 함수 참조를 저장하기 위해 전역 Map 사용
 */
interface SelectItemTemplateProps<TValue> {
  children: (item: TValue, index: number, depth: number) => JSX.Element;
}

// 템플릿 함수를 저장하는 전역 Map (WeakMap 사용하여 메모리 누수 방지)
const templateFnMap = new WeakMap<
  HTMLElement,
  (item: unknown, index: number, depth: number) => JSX.Element
>();

const SelectItemTemplate = <T,>(props: SelectItemTemplateProps<T>) => (
  <span
    ref={(el) => {
      templateFnMap.set(
        el,
        props.children as (item: unknown, index: number, depth: number) => JSX.Element,
      );
    }}
    data-select-item-template
    style={{ display: "none" }}
  />
);

// Props 정의

// 공통 Props (value, onValueChange, multiple 제외)
interface SelectCommonProps {
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

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

// 단일 선택 Props
interface SelectSingleBaseProps<TValue> extends SelectCommonProps {
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
interface SelectMultipleBaseProps<TValue> extends SelectCommonProps {
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
  ]);

  let triggerRef!: HTMLDivElement;

  const [open, setOpen] = createSignal(false);

  // 선택된 값 관리 (controlled/uncontrolled 패턴)
  type ValueType = T | T[] | undefined;
  const [getValue, setInternalValue] = createControllableSignal<ValueType>({
    value: () => local.value,
    onChange: () => local.onValueChange as ((v: ValueType) => void) | undefined,
  } as Parameters<typeof createControllableSignal<ValueType>>[0]);

  // 값이 선택되어 있는지 확인
  const isSelected = (value: T): boolean => {
    const current = getValue();
    if (current === undefined) return false;

    if (local.multiple) {
      return Array.isArray(current) && current.includes(value);
    }
    return current === value;
  };

  // 값 토글
  const toggleValue = (value: T) => {
    if (local.multiple) {
      const current = (getValue() as T[] | undefined) ?? [];
      const idx = current.indexOf(value);
      if (idx >= 0) {
        setInternalValue([...current.slice(0, idx), ...current.slice(idx + 1)] as T[]);
      } else {
        setInternalValue([...current, value] as T[]);
      }
    } else {
      setInternalValue(value);
    }
  };

  // 드롭다운 닫기
  const closeDropdown = () => {
    setOpen(false);
  };

  // Context 값
  const contextValue: SelectContextValue<T> = {
    multiple: () => local.multiple ?? false,
    isSelected,
    toggleValue,
    closeDropdown,
  };

  // 트리거 클릭
  const handleTriggerClick = () => {
    if (local.disabled) return;
    setOpen((v) => !v);
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
    const v = getValue();
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

  // 내부 컴포넌트: Provider 안에서 children을 resolve
  const SelectInner: ParentComponent = (innerProps) => {
    const resolved = children(() => innerProps.children);
    const [slots, items] = splitSlots(resolved, [
      "selectHeader",
      "selectAction",
      "selectItemTemplate",
    ] as const);

    // itemTemplate 함수 추출
    const getItemTemplate = ():
      | ((item: T, index: number, depth: number) => JSX.Element)
      | undefined => {
      const templateSlots = slots().selectItemTemplate;
      if (templateSlots.length === 0) return undefined;
      // WeakMap에서 함수 참조 가져오기
      return templateFnMap.get(templateSlots[0]) as
        | ((item: T, index: number, depth: number) => JSX.Element)
        | undefined;
    };

    // items 재귀 렌더링
    const renderItems = (itemList: T[], depth: number): JSX.Element => {
      const itemTemplate = getItemTemplate();
      return (
        <For each={itemList}>
          {(item, index) => (
            <SelectItem value={item}>
              {itemTemplate ? itemTemplate(item, index(), depth) : String(item)}
              <Show when={local.getChildren?.(item, index(), depth)} keyed>
                {(itemChildren) => (
                  <Show when={itemChildren.length > 0}>
                    <SelectItem.Children>
                      {renderItems(itemChildren, depth + 1)}
                    </SelectItem.Children>
                  </Show>
                )}
              </Show>
            </SelectItem>
          )}
        </For>
      );
    };

    // 선택된 값 렌더링 (items 방식일 때 itemTemplate 재사용)
    const renderValue = (value: T): JSX.Element => {
      if (local.renderValue) {
        return local.renderValue(value);
      }
      const itemTemplate = getItemTemplate();
      if (itemTemplate) {
        return itemTemplate(value, 0, 0);
      }
      return <>{String(value)}</>;
    };

    // 선택된 값 표시
    const renderSelectedValue = (): JSX.Element => {
      const current = getValue();

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

    return (
      <div {...rest} data-select class={clsx("group", local.inset ? "flex" : "inline-flex")}>
        <div
          ref={triggerRef}
          use:ripple={!local.disabled}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open()}
          aria-disabled={local.disabled || undefined}
          aria-required={local.required || undefined}
          tabIndex={local.disabled ? -1 : 0}
          class={twMerge(
            getTriggerClassName(),
            slots().selectAction.length > 0 &&
              clsx(
                "rounded-r-none border-r-0",
                "group-focus-within:border-primary-400 dark:group-focus-within:border-primary-400",
              ),
          )}
          style={local.style}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
        >
          <div class={selectedValueClass}>{renderSelectedValue()}</div>
          <div class={chevronWrapperClass}>
            <Icon icon={IconChevronDown} size="1em" />
          </div>
        </div>
        <Show when={slots().selectAction.length > 0}>
          <div
            class={clsx(
              "contents",
              "[&>[data-select-action]:last-child]:rounded-r",
              "[&>[data-select-action]+[data-select-action]]:-ml-px",
            )}
          >
            {slots().selectAction}
          </div>
        </Show>

        <Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen} keyboardNav>
          <Show when={slots().selectHeader.length > 0}>{slots().selectHeader.single()}</Show>
          <List inset role="listbox">
            <Show when={local.items} fallback={items()}>
              {renderItems(local.items!, 0)}
            </Show>
          </List>
        </Dropdown>
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
