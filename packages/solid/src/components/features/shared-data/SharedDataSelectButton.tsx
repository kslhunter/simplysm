import { type JSX, splitProps } from "solid-js";
import { type SharedDataAccessor } from "../../../providers/shared-data/SharedDataContext";
import {
  DataSelectButton,
  type DataSelectButtonProps,
} from "../data-select-button/DataSelectButton";
import { type ComponentSize } from "../../../styles/tokens.styles";

/** SharedDataSelectButton Props */
export interface SharedDataSelectButtonProps<TItem> {
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

  /** Selection modal component factory */
  modal: () => JSX.Element;
  /** Item rendering function */
  children: (item: TItem) => JSX.Element;
}

export function SharedDataSelectButton<TItem>(
  props: SharedDataSelectButtonProps<TItem>,
): JSX.Element {
  const [local, rest] = splitProps(props, ["data", "children"]);

  return (
    <DataSelectButton
      load={(keys) => local.data.items().filter((item) => keys.includes(local.data.getKey(item)))}
      renderItem={local.children}
      {...rest}
    />
  );
}
