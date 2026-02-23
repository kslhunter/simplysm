import { createMemo, type JSX, Show, splitProps } from "solid-js";
import { IconExternalLink } from "@tabler/icons-solidjs";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import { SelectList } from "../../form-control/select-list/SelectList";
import { Icon } from "../../display/Icon";
import { useDialog } from "../../disclosure/DialogContext";

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

  /** 서브 컴포넌트용 children (ItemTemplate 등) */
  children: JSX.Element;
}

export function SharedDataSelectList<TItem>(props: SharedDataSelectListProps<TItem>): JSX.Element {
  const [local, rest] = splitProps(props, ["data", "filterFn", "modal", "header", "children"]);

  const dialog = useDialog();

  // filterFn 적용된 items
  const items = createMemo(() => {
    const allItems = local.data.items();
    if (!local.filterFn) return allItems;
    return allItems.filter(local.filterFn);
  });

  // modal 열기
  const handleOpenModal = async () => {
    if (!local.modal) return;
    await dialog.show(local.modal, {});
  };

  return (
    <SelectList
      {...rest}
      items={items()}
      getSearchText={local.data.getSearchText}
      getIsHidden={local.data.getIsHidden}
    >
      {/* header + modal 아이콘을 SelectList.Header로 결합 */}
      <Show when={local.header != null || local.modal != null}>
        <SelectList.Header>
          <div class="flex items-center gap-1">
            <Show when={local.header != null}>
              <span>{local.header}</span>
            </Show>
            <Show when={local.modal != null}>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded p-0.5 text-base-500 hover:text-primary-500 dark:text-base-400 dark:hover:text-primary-400"
                aria-label="관리"
                onClick={() => void handleOpenModal()}
              >
                <Icon icon={IconExternalLink} size="1em" />
              </button>
            </Show>
          </div>
        </SelectList.Header>
      </Show>
      {local.children}
    </SelectList>
  );
}
