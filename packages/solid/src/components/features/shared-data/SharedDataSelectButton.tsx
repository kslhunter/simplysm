import { type Component, type JSX, splitProps } from "solid-js";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import {
  DataSelectButton,
  type DataSelectButtonProps,
  type SelectDialogBaseProps,
  type DialogPropsField,
} from "../data-select-button/DataSelectButton";
import { type DialogShowOptions } from "../../disclosure/DialogContext";
import { type ComponentSize } from "../../../styles/tokens.styles";

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
  const [local, rest] = splitProps(props as any, ["data", "children"]);

  const dataSelectProps = {
    ...rest,
    load: (keys: (string | number)[]) =>
      (local as any).data.items().filter((item: TItem) => keys.includes((local as any).data.getKey(item))),
    renderItem: (local as any).children,
  } as unknown as DataSelectButtonProps<TItem, string | number, TDialogProps>;

  // DataSelectButton is called as a function to avoid JSX failing to resolve
  // the conditional type DialogPropsField<TDialogProps> when TDialogProps is generic.
  // eslint-disable-next-line new-cap
  return DataSelectButton(dataSelectProps);
}
