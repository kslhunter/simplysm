import { createMemo, type JSX, mergeProps, splitProps } from "solid-js";
import { IconEdit, IconSearch } from "@tabler/icons-solidjs";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import { Select, type SelectProps } from "../../form-control/select/Select";
import { Icon } from "../../display/Icon";
import { useDialog } from "../../disclosure/DialogContext";
import { type ComponentSize } from "../../../styles/tokens.styles";

/** SharedDataSelect Props */
export interface SharedDataSelectProps<TItem> {
  /** Shared data accessor */
  data: SharedDataAccessor<TItem>;

  /** Currently selected value */
  value?: unknown;
  /** Value change callback */
  onValueChange?: (value: unknown) => void;
  /** Multiple selection mode */
  multiple?: boolean;
  /** Required input */
  required?: boolean;
  /** Disabled */
  disabled?: boolean;
  /** Trigger size */
  size?: ComponentSize;
  /** Borderless style */
  inset?: boolean;

  /** Item filter function */
  filterFn?: (item: TItem, index: number) => boolean;
  /** Selection modal component factory */
  modal?: () => JSX.Element;
  /** Edit modal component factory */
  editModal?: () => JSX.Element;

  /** Item rendering function */
  children: (item: TItem, index: number, depth: number) => JSX.Element;
}

export function SharedDataSelect<TItem>(props: SharedDataSelectProps<TItem>): JSX.Element {
  const [local, rest] = splitProps(props, ["data", "filterFn", "modal", "editModal", "children"]);

  const dialog = useDialog();

  // Items with filterFn applied
  const items = createMemo(() => {
    const allItems = local.data.items();
    if (!local.filterFn) return allItems;
    return allItems.filter(local.filterFn);
  });

  // Open modal
  const handleOpenModal = async () => {
    if (!local.modal) return;
    await dialog.show(local.modal, {});
  };

  // Open edit modal
  const handleOpenEditModal = async () => {
    if (!local.editModal) return;
    await dialog.show(local.editModal, {});
  };

  // Use mergeProps + as for Select's discriminated union (multiple: true | false?) and TItem → unknown conversion
  // Wrap with getter to satisfy SolidJS reactivity lint rules
  const selectProps = mergeProps(rest, {
    get items() {
      return items();
    },
    get getChildren() {
      if (!local.data.getParentKey) return undefined;
      // eslint-disable-next-line solid/reactivity -- return function is called within Select's internal JSX tracked scope
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
        <Select.Action onClick={() => void handleOpenModal()} aria-label="Search">
          <Icon icon={IconSearch} size="1em" />
        </Select.Action>
      )}
      {local.editModal && (
        <Select.Action onClick={() => void handleOpenEditModal()} aria-label="Edit">
          <Icon icon={IconEdit} size="1em" />
        </Select.Action>
      )}
    </Select>
  );
}
