import { type Component, type JSX, splitProps } from "solid-js";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataProvider";
import {
  DataSelectButton,
  type DataSelectButtonProps,
  type SelectDialogBaseProps,
  type DialogPropsField,
} from "../data-select-button/DataSelectButton";
import { type DialogShowOptions } from "../../disclosure/Dialog";
import { type ComponentSize } from "../../../styles/control.styles";

/** SharedDataSelectButton Props */
export type SharedDataSelectButtonProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> = {
  /** Shared data accessor */
  data: SharedDataAccessor<TItem>;
  /** Currently selected key(s) (single or multiple) */
  value?: DataSelectButtonProps<TItem>["value"];
  /** Value change callback */
  onValueChange?: DataSelectButtonProps<TItem>["onValueChange"];
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
  /** Selection dialog component */
  dialog: Component<TDialogProps>;
  /** Dialog options (header, size, etc.) */
  dialogOptions?: DialogShowOptions;
  /** Item rendering function */
  children: (item: TItem) => JSX.Element;
} & DialogPropsField<TDialogProps>;

export function SharedDataSelectButton<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
>(
  props: SharedDataSelectButtonProps<TItem, TDialogProps>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["data", "children"]);

  return (
    <DataSelectButton
      load={(keys) => local.data.items().filter((item: TItem) => keys.includes(local.data.getKey(item)))}
      renderItem={local.children}
      {...(rest as any)}
    />
  );
}
