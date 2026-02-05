import {
  children,
  createEffect,
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
import { splitSlots } from "../../../utils/splitSlots";

void ripple;

// 트리거 스타일
const triggerBaseClass = clsx(
  clsx`inline-flex items-center gap-2`,
  "min-w-40",
  clsx`border border-neutral-300 dark:border-neutral-600`,
  "rounded",
  clsx`bg-transparent`,
  clsx`hover:bg-neutral-100 dark:hover:bg-neutral-800`,
  "cursor-pointer",
  "focus:outline-none",
  "focus-within:border-primary-400 dark:focus-within:border-primary-400",
);

const triggerDisabledClass = clsx`cursor-default bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500`;

const triggerInsetClass = clsx`rounded-none border-none bg-transparent`;

const sizeClasses = {
  sm: clsx`gap-1.5 px-1.5 py-0.5`,
  default: clsx`px-2 py-1`,
  lg: clsx`gap-3 px-3 py-2`,
};

/**
 * Select 우측 버튼 서브 컴포넌트
 */
interface SelectButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectButton: ParentComponent<SelectButtonProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <button
      {...rest}
      type="button"
      data-select-button
      class={twMerge(
        clsx(
          "border-l border-neutral-300 px-2 dark:border-neutral-600",
          "font-bold text-primary-500",
          "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        ),
        local.class,
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (typeof rest.onClick === "function") {
          rest.onClick(e);
        }
      }}
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
 */
interface SelectItemTemplateProps<T> {
  children: (item: T, index: number, depth: number) => JSX.Element;
}

const SelectItemTemplate = <T,>(props: SelectItemTemplateProps<T>) => <>{props.children}</>;

// Props 정의
interface SelectBaseProps<T> {
  /** 현재 선택된 값 */
  value?: T | T[];

  /** 값 변경 콜백 */
  onValueChange?: (value: T | T[]) => void;

  /** 다중 선택 모드 */
  multiple?: boolean;

  /** 비활성화 */
  disabled?: boolean;

  /** 필수 입력 */
  required?: boolean;

  /** 미선택 시 표시 텍스트 */
  placeholder?: string;

  /** 트리거 크기 */
  size?: "sm" | "lg";

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 다중 선택 시 표시 방향 */
  multiDisplayDirection?: "horizontal" | "vertical";

  /** 전체 선택 버튼 숨기기 */
  hideSelectAll?: boolean;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

interface SelectWithItemsProps<T> extends SelectBaseProps<T> {
  items: T[];
  getChildren?: (item: T, index: number, depth: number) => T[] | undefined;
  renderValue?: (value: T) => JSX.Element;
  children?: JSX.Element;
}

interface SelectWithChildrenProps<T> extends SelectBaseProps<T> {
  items?: never;
  getChildren?: never;
  renderValue: (value: T) => JSX.Element;
  children: JSX.Element;
}

export type SelectProps<T = unknown> = SelectWithItemsProps<T> | SelectWithChildrenProps<T>;

interface SelectComponent {
  <T = unknown>(props: SelectProps<T>): JSX.Element;
  Item: typeof SelectItem;
  Button: typeof SelectButton;
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
  ]);

  void rest;

  let triggerRef!: HTMLDivElement;

  const [open, setOpen] = createSignal(false);

  // 선택된 값 관리 (controlled/uncontrolled 패턴)
  type ValueType = T | T[] | undefined;
  const [internalValue, setInternalValueRaw] = createSignal<ValueType>(undefined);

  // props 변경 시 내부 상태 동기화
  createEffect(() => {
    const propValue = local.value;
    setInternalValueRaw(() => propValue);
  });

  const isControlled = () => local.onValueChange !== undefined;
  const getValue = () => (isControlled() ? local.value : internalValue());
  const setInternalValue = (newValue: ValueType) => {
    if (isControlled()) {
      local.onValueChange?.(newValue as T | T[]);
    } else {
      setInternalValueRaw(() => newValue);
    }
  };

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

  // 선택된 값 표시
  const renderSelectedValue = () => {
    const current = getValue();

    if (current === undefined || (Array.isArray(current) && current.length === 0)) {
      return <span class="text-neutral-400 dark:text-neutral-500">{local.placeholder ?? ""}</span>;
    }

    if (local.multiple && Array.isArray(current)) {
      const direction = local.multiDisplayDirection ?? "horizontal";
      return (
        <div class={clsx("flex gap-1", direction === "vertical" ? "flex-col" : "flex-wrap")}>
          <For each={current}>
            {(v) => (
              <span class="rounded bg-neutral-200 px-1 dark:bg-neutral-700">
                {local.renderValue ? local.renderValue(v) : String(v)}
              </span>
            )}
          </For>
        </div>
      );
    }

    return local.renderValue ? local.renderValue(current as T) : String(current);
  };

  // 트리거 클래스
  const getTriggerClassName = () =>
    twMerge(
      triggerBaseClass,
      sizeClasses[local.size ?? "default"],
      local.disabled && triggerDisabledClass,
      local.inset && triggerInsetClass,
      local.class,
    );

  // 내부 컴포넌트: Provider 안에서 children을 resolve
  const SelectInner: ParentComponent = (innerProps) => {
    const resolved = children(() => innerProps.children);
    const [slots, items] = splitSlots(resolved, ["selectHeader", "selectButton"] as const);

    return (
      <>
        <div class="inline-flex">
          <div
            ref={triggerRef}
            use:ripple={!local.disabled}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open()}
            aria-disabled={local.disabled || undefined}
            aria-required={local.required || undefined}
            tabIndex={local.disabled ? -1 : 0}
            class={getTriggerClassName()}
            style={local.style}
            onClick={handleTriggerClick}
            onKeyDown={handleTriggerKeyDown}
          >
            <div class="flex-1 whitespace-nowrap">{renderSelectedValue()}</div>
            <div class="opacity-30 hover:opacity-100">
              <Icon icon={IconChevronDown} size="1rem" />
            </div>
          </div>
          <Show when={slots().selectButton.length > 0}>{slots().selectButton}</Show>
        </div>

        <Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen} enableKeyboardNav>
          <Show when={slots().selectHeader.length > 0}>{slots().selectHeader.single()}</Show>
          <List inset role="listbox">
            {items()}
          </List>
        </Dropdown>
      </>
    );
  };

  return (
    <SelectContext.Provider value={contextValue as SelectContextValue}>
      <SelectInner>{local.children}</SelectInner>
    </SelectContext.Provider>
  );
};

Select.Item = SelectItem;
Select.Button = SelectButton;
Select.Header = SelectHeader;
Select.ItemTemplate = SelectItemTemplate;
