import {
  children,
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  onCleanup,
  type ParentComponent,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { List } from "../../data/list/List";
import { Pagination } from "../../data/Pagination";
import { TextInput } from "../field/TextInput";
import { createSlotSignal } from "../../../hooks/createSlotSignal";
import { SelectListContext, type SelectListContextValue } from "./SelectListContext";
import { useSelectListContext } from "./SelectListContext";
import { textMuted } from "../../../styles/tokens.styles";

// ─── 서브 컴포넌트 ──────────────────────────────────────

/**
 * Header 슬롯 서브 컴포넌트
 */
const SelectListHeader: ParentComponent = (props) => {
  const ctx = useSelectListContext();
  // eslint-disable-next-line solid/reactivity -- 슬롯 accessor로 저장, JSX tracked scope에서 호출됨
  ctx.setHeader(() => props.children);
  onCleanup(() => ctx.setHeader(undefined));
  return null;
};

/**
 * Filter 슬롯 서브 컴포넌트
 */
const SelectListFilter: ParentComponent = (props) => {
  const ctx = useSelectListContext();
  // eslint-disable-next-line solid/reactivity -- 슬롯 accessor로 저장, JSX tracked scope에서 호출됨
  ctx.setFilter(() => props.children);
  onCleanup(() => ctx.setFilter(undefined));
  return null;
};

/**
 * ItemTemplate 서브 컴포넌트
 */
const SelectListItemTemplate = <TArgs extends unknown[]>(props: {
  children: (...args: TArgs) => JSX.Element;
}) => {
  const ctx = useSelectListContext();
  // eslint-disable-next-line solid/reactivity -- 렌더 함수를 signal에 저장, JSX tracked scope에서 호출됨
  ctx.setItemTemplate(props.children as (...args: unknown[]) => JSX.Element);
  onCleanup(() => ctx.setItemTemplate(undefined));
  return null;
};

// ─── Props ──────────────────────────────────────────────

export interface SelectListProps<TValue> {
  /** 목록 아이템 배열 */
  items: TValue[];

  /** 현재 선택된 값 */
  value?: TValue;

  /** 값 변경 콜백 */
  onValueChange?: (value: TValue | undefined) => void;

  /** 필수 선택 여부 (true이면 미지정 항목 숨김) */
  required?: boolean;

  /** 비활성화 */
  disabled?: boolean;

  /** 검색 텍스트 추출 함수 (있으면 검색 TextInput 자동 표시) */
  getSearchText?: (item: TValue) => string;

  /** 숨김 여부 필터 */
  getIsHidden?: (item: TValue) => boolean;

  /** 커스텀 필터 함수 */
  filterFn?: (item: TValue, index: number) => boolean;

  /** 값 변경 가드 (false 반환 시 변경 차단) */
  canChange?: (item: TValue | undefined) => boolean | Promise<boolean>;

  /** 페이지 크기 (있으면 Pagination 자동 표시) */
  pageSize?: number;

  /** 헤더 텍스트 (Header 슬롯보다 우선순위 낮음) */
  header?: string;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;

  /** 서브 컴포넌트용 children */
  children?: JSX.Element;
}

// ─── 스타일 ──────────────────────────────────────────────

const containerClass = clsx("flex-col gap-1");

const headerClass = clsx("px-2 py-1 text-sm font-semibold");

// ─── 컴포넌트 ───────────────────────────────────────────

interface SelectListComponent {
  <TValue = unknown>(props: SelectListProps<TValue>): JSX.Element;
  Header: typeof SelectListHeader;
  Filter: typeof SelectListFilter;
  ItemTemplate: typeof SelectListItemTemplate;
}

export const SelectList: SelectListComponent = <TValue,>(props: SelectListProps<TValue>) => {
  const [local, rest] = splitProps(props as SelectListProps<TValue> & { children?: JSX.Element }, [
    "children",
    "class",
    "style",
    "items",
    "value",
    "onValueChange",
    "required",
    "disabled",
    "getSearchText",
    "getIsHidden",
    "filterFn",
    "canChange",
    "pageSize",
    "header",
  ]);

  // ─── 내부 상태 ─────────────────────────────────────────

  const [searchText, setSearchText] = createSignal("");
  const [page, setPage] = createSignal(1);

  // ─── 슬롯 signals ────────────────────────────────────

  const [headerSlot, setHeader] = createSlotSignal();
  const [filterSlot, setFilter] = createSlotSignal();
  const [itemTemplate, _setItemTemplate] = createSignal<
    ((...args: unknown[]) => JSX.Element) | undefined
  >();
  const setItemTemplate = (fn: ((...args: unknown[]) => JSX.Element) | undefined) =>
    _setItemTemplate(() => fn);

  // Context 값
  const contextValue: SelectListContextValue = {
    setHeader,
    setFilter,
    setItemTemplate,
  };

  // ─── items 변경 시 value 자동 재매칭 ──────────────────

  createEffect(() => {
    const currentItems = local.items;
    const currentValue = local.value;
    if (currentValue === undefined) return;

    // 새 items에서 현재 value를 참조로 찾기
    const found = currentItems.find((item) => item === currentValue);
    if (found !== undefined) {
      // 이미 같은 참조면 아무 것도 하지 않음
      return;
    }

    // 참조가 없으면 현재 value를 유지 (호출하지 않음)
  });

  // ─── 필터링 파이프라인 ─────────────────────────────────

  // getIsHidden 필터 → 검색 필터 → filterFn
  const filteredItems = createMemo(() => {
    let result = local.items;

    // getIsHidden 필터
    if (local.getIsHidden) {
      const fn = local.getIsHidden;
      result = result.filter((item) => !fn(item));
    }

    // 검색 필터
    const search = searchText().trim().toLowerCase();
    if (search && local.getSearchText) {
      const getText = local.getSearchText;
      result = result.filter((item) => getText(item).toLowerCase().includes(search));
    }

    // filterFn
    if (local.filterFn) {
      const fn = local.filterFn;
      result = result.filter((item, index) => fn(item, index));
    }

    return result;
  });

  // 페이지 수 계산
  const totalPageCount = createMemo(() => {
    if (local.pageSize == null) return 1;
    return Math.max(1, Math.ceil(filteredItems().length / local.pageSize));
  });

  // 검색이나 필터 변경 시 페이지 리셋
  createEffect(() => {
    // filteredItems에 의존
    void filteredItems();
    setPage(1);
  });

  // 페이지 슬라이스
  const displayItems = createMemo(() => {
    const items = filteredItems();
    if (local.pageSize == null) return items;

    const start = (page() - 1) * local.pageSize;
    const end = start + local.pageSize;
    return items.slice(start, end);
  });

  // ─── 선택/토글 핸들러 ─────────────────────────────────

  const handleSelect = async (item: TValue | undefined) => {
    if (local.disabled) return;

    // canChange 가드
    if (local.canChange) {
      const allowed = await local.canChange(item);
      if (!allowed) return;
    }

    // 토글: 이미 선택된 값을 다시 클릭하면 선택 해제 (required가 아닐 때만)
    if (item !== undefined && item === local.value && !local.required) {
      local.onValueChange?.(undefined);
    } else {
      local.onValueChange?.(item);
    }
  };

  // ─── 아이템 렌더링 ────────────────────────────────────

  const getItemTemplate = (): ((item: TValue, index: number) => JSX.Element) | undefined => {
    return itemTemplate() as ((item: TValue, index: number) => JSX.Element) | undefined;
  };

  const renderItem = (item: TValue, index: number): JSX.Element => {
    const tpl = getItemTemplate();
    if (tpl) {
      return tpl(item, index);
    }
    return <>{String(item)}</>;
  };

  // ─── 내부 렌더링 ──────────────────────────────────────

  const SelectListInner: ParentComponent = (innerProps) => {
    // children() resolve로 서브 컴포넌트 등록 트리거
    const resolved = children(() => innerProps.children);
    // resolved는 사용하지 않지만 서브 컴포넌트가 등록되도록 evaluate 필요
    void resolved;

    return (
      <div
        {...rest}
        data-select-list
        class={twMerge(containerClass, local.class)}
        style={local.style}
      >
        {/* Header: 슬롯 우선, 없으면 props.header 텍스트 */}
        <Show
          when={headerSlot()}
          fallback={
            <Show when={local.header}>
              <div class={headerClass}>{local.header}</div>
            </Show>
          }
        >
          {headerSlot()!()}
        </Show>

        {/* Filter: 슬롯 우선, 없으면 getSearchText 있을 때 TextInput */}
        <Show
          when={filterSlot()}
          fallback={
            <Show when={local.getSearchText}>
              <TextInput
                class={"w-full"}
                value={searchText()}
                onValueChange={setSearchText}
                placeholder="검색..."
                disabled={local.disabled}
              />
            </Show>
          }
        >
          {filterSlot()!()}
        </Show>

        {/* Pagination */}
        <Show when={local.pageSize != null && totalPageCount() > 1}>
          <Pagination
            page={page()}
            onPageChange={setPage}
            totalPageCount={totalPageCount()}
            size="sm"
          />
        </Show>

        {/* List */}
        <List inset>
          {/* 미지정 항목 (required가 아닐 때) */}
          <Show when={!local.required}>
            <List.Item
              selected={local.value === undefined}
              disabled={local.disabled}
              onClick={() => handleSelect(undefined)}
            >
              <span class={textMuted}>미지정</span>
            </List.Item>
          </Show>

          {/* 아이템 목록 */}
          <For each={displayItems()}>
            {(item, index) => (
              <List.Item
                selected={item === local.value}
                disabled={local.disabled}
                onClick={() => handleSelect(item)}
              >
                {renderItem(item, index())}
              </List.Item>
            )}
          </For>
        </List>
      </div>
    );
  };

  return (
    <SelectListContext.Provider value={contextValue}>
      <SelectListInner>{local.children}</SelectListInner>
    </SelectListContext.Provider>
  );
};

SelectList.Header = SelectListHeader;
SelectList.Filter = SelectListFilter;
SelectList.ItemTemplate = SelectListItemTemplate;
