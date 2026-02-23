import { createMemo, type JSX, mergeProps, splitProps } from "solid-js";
import { IconEdit, IconSearch } from "@tabler/icons-solidjs";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import { Select, type SelectProps } from "../select/Select";
import { Icon } from "../../display/Icon";
import { useDialog } from "../../disclosure/DialogContext";
import { type ComponentSize } from "../../../styles/tokens.styles";

/** SharedDataSelect Props */
export interface SharedDataSelectProps<TItem> {
  /** 공유 데이터 접근자 */
  data: SharedDataAccessor<TItem>;

  /** 현재 선택된 값 */
  value?: unknown;
  /** 값 변경 콜백 */
  onValueChange?: (value: unknown) => void;
  /** 다중 선택 모드 */
  multiple?: boolean;
  /** 필수 입력 */
  required?: boolean;
  /** 비활성화 */
  disabled?: boolean;
  /** 트리거 크기 */
  size?: ComponentSize;
  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 항목 필터 함수 */
  filterFn?: (item: TItem, index: number) => boolean;
  /** 선택 모달 컴포넌트 팩토리 */
  modal?: () => JSX.Element;
  /** 편집 모달 컴포넌트 팩토리 */
  editModal?: () => JSX.Element;

  /** 아이템 렌더링 함수 */
  children: (item: TItem, index: number, depth: number) => JSX.Element;
}

export function SharedDataSelect<TItem>(props: SharedDataSelectProps<TItem>): JSX.Element {
  const [local, rest] = splitProps(props, ["data", "filterFn", "modal", "editModal", "children"]);

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

  // editModal 열기
  const handleOpenEditModal = async () => {
    if (!local.editModal) return;
    await dialog.show(local.editModal, {});
  };

  // Select의 discriminated union (multiple: true | false?)과 TItem → unknown 변환을 위해 mergeProps + as 사용
  // getter로 래핑하여 SolidJS 반응성 lint 규칙 충족
  const selectProps = mergeProps(rest, {
    get items() {
      return items();
    },
    get getChildren() {
      if (!local.data.getParentKey) return undefined;
      // eslint-disable-next-line solid/reactivity -- 반환 함수는 Select 내부 JSX tracked scope에서 호출됨
      return (item: TItem) => {
        const key = local.data.getKey(item);
        return items().filter((child) => local.data.getParentKey!(child) === key);
      };
    },
    get getSearchText() {
      return local.data.getSearchText;
    },
    get getIsHidden() {
      return local.data.getIsHidden;
    },
  }) as unknown as SelectProps;

  return (
    <Select {...selectProps}>
      <Select.ItemTemplate>{local.children}</Select.ItemTemplate>
      {local.modal && (
        <Select.Action onClick={() => void handleOpenModal()} aria-label="검색">
          <Icon icon={IconSearch} size="1em" />
        </Select.Action>
      )}
      {local.editModal && (
        <Select.Action onClick={() => void handleOpenEditModal()} aria-label="편집">
          <Icon icon={IconEdit} size="1em" />
        </Select.Action>
      )}
    </Select>
  );
}
