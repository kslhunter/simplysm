import { type JSX } from "solid-js";
import { Checkbox } from "./Checkbox";
import { createSelectionGroup } from "../../../hooks/createSelectionGroup";
import type { CheckboxSize } from "./Checkbox.styles";

interface CheckboxGroupProps<TValue> {
  value?: TValue[];
  onValueChange?: (value: TValue[]) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  required?: boolean;
  validate?: (value: TValue[]) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

interface CheckboxGroupComponent {
  <TValue = unknown>(props: CheckboxGroupProps<TValue>): JSX.Element;
  Item: <TValue = unknown>(props: {
    value: TValue;
    disabled?: boolean;
    children?: JSX.Element;
  }) => JSX.Element;
}

const { Group } = createSelectionGroup({
  mode: "multiple",
  contextName: "CheckboxGroup",
  ItemComponent: Checkbox,
  emptyErrorMsg: "Please select an item",
});

export const CheckboxGroup = Group as unknown as CheckboxGroupComponent;
