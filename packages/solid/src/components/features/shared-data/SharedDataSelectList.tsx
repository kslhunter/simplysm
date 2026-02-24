import { createEffect, createMemo, createSignal, For, type JSX, Show, splitProps } from "solid-js";
import { IconExternalLink } from "@tabler/icons-solidjs";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import { List } from "../../data/list/List";
import { Pagination } from "../../data/Pagination";
import { Button } from "../../form-control/Button";
import { Icon } from "../../display/Icon";
import { useDialog } from "../../disclosure/DialogContext";
import { textMuted } from "../../../styles/tokens.styles";

/** SharedDataSelectList Props */
export interface SharedDataSelectListProps<TItem> {
  /** 공유 데이터 접근자 */
  data: SharedDataAccessor<TItem>;

  /** 현재 선택된 값 */
  value?: TItem;
  /** 값 변경 콜백 */
  onValueChange?: (value: TItem | undefined) => void;
  /** 필수 입력 */
  required?: boolean;
  /** 비활성화 */
  disabled?: boolean;

  /** 항목 필터 함수 */
  filterFn?: (item: TItem, index: number) => boolean;
  /** 값 변경 가드 (false 반환 시 변경 차단) */
  canChange?: (item: TItem | undefined) => boolean | Promise<boolean>;
  /** 페이지 크기 (있으면 Pagination 자동 표시) */
  pageSize?: number;
  /** 헤더 텍스트 */
  header?: string;
  /** 관리 모달 컴포넌트 팩토리 */
  modal?: () => JSX.Element;

  /** 아이템 렌더 함수 */
  children: (item: TItem, index: number) => JSX.Element;

  /** 커스텀 class */
  class?: string;
  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

// ─── 스타일 ──────────────────────────────────────────────

const containerClass = clsx("flex-col gap-1");

const headerClass = clsx("px-2 py-1 text-sm font-semibold flex items-center gap-1");

// ─── 컴포넌트 ───────────────────────────────────────────

export function SharedDataSelectList<TItem>(props: SharedDataSelectListProps<TItem>): JSX.Element {
  const [local, rest] = splitProps(props, [
    "data",
    "children",
    "class",
    "style",
    "value",
    "onValueChange",
    "required",
    "disabled",
    "filterFn",
    "canChange",
    "pageSize",
    "header",
    "modal",
  ]);

  const dialog = useDialog();

  // ─── 페이지네이션 상태 ─────────────────────────────────

  const [page, setPage] = createSignal(1);

  // ─── 필터링 파이프라인 ─────────────────────────────────

  const filteredItems = createMemo(() => {
    let result = local.data.items();

    // getIsHidden 필터
    const isHidden = local.data.getIsHidden;
    if (isHidden) {
      result = result.filter((item) => !isHidden(item));
    }

    // filterFn
    if (local.filterFn) {
      const fn = local.filterFn;
      result = result.filter((item, index) => fn(item, index));
    }

    return result;
  });

  // ─── 페이지 계산 ───────────────────────────────────────

  const totalPageCount = createMemo(() => {
    if (local.pageSize == null) return 1;
    return Math.max(1, Math.ceil(filteredItems().length / local.pageSize));
  });

  // 필터 변경 시 페이지 리셋
  createEffect(() => {
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

  const handleSelect = async (item: TItem | undefined) => {
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

  // ─── modal 열기 ────────────────────────────────────────

  const handleOpenModal = async () => {
    if (!local.modal) return;
    await dialog.show(local.modal, {});
  };

  // ─── 렌더링 ────────────────────────────────────────────

  return (
    <div
      {...rest}
      data-shared-data-select-list
      class={twMerge(containerClass, local.class)}
      style={local.style}
    >
      {/* Header */}
      <Show when={local.header != null || local.modal != null}>
        <div class={headerClass}>
          <Show when={local.header != null}>{local.header}</Show>
          <Show when={local.modal != null}>
            <Button size="sm" onClick={() => void handleOpenModal()}>
              <Icon icon={IconExternalLink} />
            </Button>
          </Show>
        </div>
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
              {local.children(item, index())}
            </List.Item>
          )}
        </For>
      </List>
    </div>
  );
}
