import { children, createSignal, For, type JSX, onCleanup, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { IconChevronDown, IconLoader2 } from "@tabler/icons-solidjs";
import { DebounceQueue } from "@simplysm/core-common";
import { Icon } from "../../display/Icon";
import { Dropdown } from "../../disclosure/Dropdown";
import { List } from "../../data/list/List";
import { ComboboxContext, type ComboboxContextValue } from "./ComboboxContext";
import { ComboboxItem } from "./ComboboxItem";
import { ripple } from "../../../directives/ripple";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { splitSlots } from "../../../helpers/splitSlots";
import { type ComponentSize, textMuted } from "../../../styles/tokens.styles";
import { chevronWrapperClass, getTriggerClass } from "../DropdownTrigger.styles";

void ripple;

// Combobox 전용 스타일
const selectedValueClass = clsx("flex-1", "whitespace-nowrap", "overflow-hidden");
const inputClass = clsx(
  "min-w-0 flex-1",
  "bg-transparent outline-none",
  "placeholder:text-base-400 dark:placeholder:text-base-500",
);

const noResultsClass = clsx("px-3 py-2", textMuted);

/**
 * Combobox 아이템 렌더링 템플릿
 */
interface ComboboxItemTemplateProps<TItem> {
  children: (item: TItem, index: number) => JSX.Element;
}

// 템플릿 함수를 저장하는 전역 WeakMap
const templateFnMap = new WeakMap<HTMLElement, (item: unknown, index: number) => JSX.Element>();

const ComboboxItemTemplate = <T,>(props: ComboboxItemTemplateProps<T>) => (
  <span
    ref={(el) => {
      templateFnMap.set(el, props.children as (item: unknown, index: number) => JSX.Element);
    }}
    data-combobox-item-template
    style={{ display: "none" }}
  />
);

// Props 정의
export interface ComboboxProps<TValue = unknown> {
  /** 현재 선택된 값 */
  value?: TValue;

  /** 값 변경 콜백 */
  onValueChange?: (value: TValue) => void;

  /** 아이템 로드 함수 (필수) */
  loadItems: (query: string) => Promise<TValue[]>;

  /** 디바운스 딜레이 (기본값: 300ms) */
  debounceMs?: number;

  /** 커스텀 값 허용 */
  allowCustomValue?: boolean;

  /** 커스텀 값 파싱 함수 */
  parseCustomValue?: (text: string) => TValue;

  /** 선택된 값을 렌더링하는 함수 (필수) */
  renderValue: (value: TValue) => JSX.Element;

  /** 비활성화 */
  disabled?: boolean;

  /** 필수 입력 */
  required?: boolean;

  /** 플레이스홀더 */
  placeholder?: string;

  /** 트리거 크기 */
  size?: ComponentSize;

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;

  /** children (Combobox.Item 또는 Combobox.ItemTemplate) */
  children?: JSX.Element;
}

interface ComboboxComponent {
  <TValue = unknown>(props: ComboboxProps<TValue>): JSX.Element;
  Item: typeof ComboboxItem;
  ItemTemplate: typeof ComboboxItemTemplate;
}

/**
 * Combobox 컴포넌트
 *
 * 비동기 검색과 아이템 선택을 지원하는 자동완성 컴포넌트입니다.
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <Combobox
 *   loadItems={async (query) => {
 *     const response = await fetch(`/api/search?q=${query}`);
 *     return response.json();
 *   }}
 *   renderValue={(item) => item.name}
 *   value={selected()}
 *   onValueChange={setSelected}
 * >
 *   <Combobox.ItemTemplate>
 *     {(item) => <>{item.name}</>}
 *   </Combobox.ItemTemplate>
 * </Combobox>
 *
 * // children 방식
 * <Combobox loadItems={loadItems} renderValue={(v) => v.name}>
 *   <For each={items()}>
 *     {(item) => <Combobox.Item value={item}>{item.name}</Combobox.Item>}
 *   </For>
 * </Combobox>
 * ```
 */
export const Combobox: ComboboxComponent = <T,>(props: ComboboxProps<T>) => {
  const [local, rest] = splitProps(props as ComboboxProps<T> & { children?: JSX.Element }, [
    "children",
    "class",
    "style",
    "value",
    "onValueChange",
    "loadItems",
    "debounceMs",
    "allowCustomValue",
    "parseCustomValue",
    "renderValue",
    "disabled",
    "required",
    "placeholder",
    "size",
    "inset",
  ]);

  let triggerRef!: HTMLDivElement;

  // 상태
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [items, setItems] = createSignal<T[]>([]);
  const [busy, setBusy] = createSignal(false);

  // 선택된 값 관리 (controlled/uncontrolled 패턴)
  const [getValue, setInternalValue] = createControllableSignal<T | undefined>({
    value: () => local.value,
    onChange: () => local.onValueChange,
  } as Parameters<typeof createControllableSignal<T | undefined>>[0]);

  // 디바운스 큐 (마운트 시 한 번만 생성, debounceMs는 초기값만 사용)
  // eslint-disable-next-line solid/reactivity -- 디바운스 큐는 마운트 시점의 debounceMs로 한 번만 생성
  const debounceQueue = new DebounceQueue(local.debounceMs ?? 300);

  onCleanup(() => {
    debounceQueue.dispose();
  });

  // 값이 선택되어 있는지 확인
  const isSelected = (value: T): boolean => {
    const current = getValue();
    return current === value;
  };

  // 값 선택
  const selectValue = (value: T) => {
    setInternalValue(value);
    setQuery("");
    setOpen(false);
  };

  // 드롭다운 닫기
  const closeDropdown = () => {
    setOpen(false);
  };

  // Context 값
  const contextValue: ComboboxContextValue<T> = {
    isSelected,
    selectValue,
    closeDropdown,
  };

  // 검색 실행
  const performSearch = (searchQuery: string) => {
    // loadItems 함수 참조를 캡처하여 사용
    const loadItemsFn = local.loadItems;
    debounceQueue.run(async () => {
      setBusy(true);
      try {
        const result = await loadItemsFn(searchQuery);
        setItems(result);
      } finally {
        setBusy(false);
      }
    });
  };

  // 입력 핸들러
  const handleInput = (e: InputEvent) => {
    const target = e.currentTarget as HTMLInputElement;
    const newQuery = target.value;
    setQuery(newQuery);
    performSearch(newQuery);

    if (!open()) {
      setOpen(true);
    }
  };

  // 트리거 클릭
  const handleTriggerClick = (e: MouseEvent) => {
    if (local.disabled) return;

    // input 클릭 시 드롭다운 토글
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT") {
      if (!open()) {
        setOpen(true);
        performSearch(query());
      }
    } else {
      // 다른 영역 클릭 시 토글
      const wasOpen = open();
      setOpen(!wasOpen);
      if (!wasOpen) {
        performSearch(query());
      }
    }
  };

  // 트리거 키보드 처리
  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    if (local.disabled) return;

    if (e.key === "ArrowDown" && !open()) {
      e.preventDefault();
      setOpen(true);
      performSearch(query());
    } else if (e.key === "Escape" && open()) {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Enter" && local.allowCustomValue && query().trim() !== "") {
      e.preventDefault();
      const customValue = local.parseCustomValue ? local.parseCustomValue(query()) : (query() as T);
      selectValue(customValue);
    }
  };

  // 트리거 클래스
  const getTriggerClassName = () =>
    getTriggerClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      class: local.class,
    });

  // 참고: 초기 검색은 handleTriggerClick에서 수행됨
  // 입력 시에는 handleInput에서 performSearch가 호출됨

  // 내부 컴포넌트
  const ComboboxInner = (innerProps: { children?: JSX.Element }) => {
    const resolved = children(() => innerProps.children);
    const [slots, childItems] = splitSlots(resolved, ["comboboxItemTemplate"] as const);

    // itemTemplate 함수 추출
    const getItemTemplate = (): ((item: T, index: number) => JSX.Element) | undefined => {
      const templateSlots = slots().comboboxItemTemplate;
      if (templateSlots.length === 0) return undefined;
      return templateFnMap.get(templateSlots[0]) as
        | ((item: T, index: number) => JSX.Element)
        | undefined;
    };

    // 선택된 값 또는 입력 표시
    const renderDisplayContent = (): JSX.Element => {
      const currentValue = getValue();

      // 드롭다운이 열려있거나 값이 없으면 입력 필드 표시
      if (open() || currentValue === undefined) {
        return (
          <input
            ref={(el) => {
              // 드롭다운이 열릴 때 input에 포커스
              if (open()) {
                requestAnimationFrame(() => el.focus());
              }
            }}
            type="text"
            class={inputClass}
            value={query()}
            placeholder={currentValue === undefined ? local.placeholder : undefined}
            disabled={local.disabled}
            onInput={handleInput}
          />
        );
      }

      // 값이 있고 드롭다운이 닫혀있으면 값 표시
      return <div class="truncate">{local.renderValue(currentValue)}</div>;
    };

    // 아이템 렌더링
    const renderItems = (): JSX.Element => {
      const itemTemplate = getItemTemplate();

      // 로딩 중
      if (busy()) {
        return <div class={noResultsClass}>검색 중...</div>;
      }

      // children 방식 (아이템이 직접 전달된 경우)
      const resolvedChildren = childItems();
      if (resolvedChildren.length > 0) {
        return <>{resolvedChildren}</>;
      }

      // items가 비어있는 경우
      if (items().length === 0) {
        return <div class={noResultsClass}>검색 결과가 없습니다</div>;
      }

      // ItemTemplate 방식
      if (itemTemplate) {
        return (
          <For each={items()}>
            {(item, index) => (
              <ComboboxItem value={item}>{itemTemplate(item, index())}</ComboboxItem>
            )}
          </For>
        );
      }

      // 기본 렌더링
      return (
        <For each={items()}>
          {(item) => <ComboboxItem value={item}>{String(item)}</ComboboxItem>}
        </For>
      );
    };

    return (
      <div {...rest} data-combobox class={local.inset ? "flex" : "inline-flex"}>
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
          <div class={selectedValueClass}>{renderDisplayContent()}</div>
          <div class={chevronWrapperClass}>
            <Show when={busy()} fallback={<Icon icon={IconChevronDown} size="1em" />}>
              <Icon icon={IconLoader2} size="1em" class="animate-spin" />
            </Show>
          </div>
        </div>

        <Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen} keyboardNav>
          <List inset role="listbox">
            {renderItems()}
          </List>
        </Dropdown>
      </div>
    );
  };

  return (
    <ComboboxContext.Provider value={contextValue as ComboboxContextValue}>
      <ComboboxInner>{local.children}</ComboboxInner>
    </ComboboxContext.Provider>
  );
};

Combobox.Item = ComboboxItem;
Combobox.ItemTemplate = ComboboxItemTemplate;
