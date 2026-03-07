import { type Component, type JSX, splitProps } from "solid-js";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataProvider";
import {
  DataSelectButton,
  type SelectDialogBaseProps,
  type DialogPropsField,
} from "../data-select-button/DataSelectButton";
import { type DialogShowOptions } from "../../disclosure/Dialog";
import { type ComponentSize } from "../../../styles/control.styles";

/** Common props shared between single and multiple modes */
interface SharedDataSelectButtonCommonProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> {
  /** Shared data accessor */
  data: SharedDataAccessor<TItem>;
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
}

/** Single select props */
interface SharedDataSelectButtonSingleProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> extends SharedDataSelectButtonCommonProps<TItem, TDialogProps> {
  /** Single select mode */
  multiple?: false;
  /** Currently selected key */
  value?: string | number;
  /** Value change callback */
  onValueChange?: (value: string | number | undefined) => void;
}

/** Multiple select props */
interface SharedDataSelectButtonMultipleProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> extends SharedDataSelectButtonCommonProps<TItem, TDialogProps> {
  /** Multiple select mode */
  multiple: true;
  /** Currently selected keys */
  value?: (string | number)[];
  /** Value change callback */
  onValueChange?: (value: (string | number)[]) => void;
}

/** SharedDataSelectButton Props */
export type SharedDataSelectButtonProps<
  TItem,
  TDialogProps extends SelectDialogBaseProps = SelectDialogBaseProps,
> =
  | (SharedDataSelectButtonSingleProps<TItem, TDialogProps> & DialogPropsField<TDialogProps>)
  | (SharedDataSelectButtonMultipleProps<TItem, TDialogProps> & DialogPropsField<TDialogProps>);

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
