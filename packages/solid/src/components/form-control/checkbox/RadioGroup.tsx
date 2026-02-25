import { type JSX } from "solid-js";
import { Radio } from "./Radio";
import { createSelectionGroup } from "../../../hooks/createSelectionGroup";
import type { CheckboxSize } from "./Checkbox.styles";

interface RadioGroupProps<TValue> {
  value?: TValue;
  onValueChange?: (value: TValue) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inline?: boolean;
  inset?: boolean;
  required?: boolean;
  validate?: (value: TValue | undefined) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

interface RadioGroupComponent {
  <TValue = unknown>(props: RadioGroupProps<TValue>): JSX.Element;
  Item: <TValue = unknown>(props: {
    value: TValue;
    disabled?: boolean;
    children?: JSX.Element;
  }) => JSX.Element;
}

const { Group } = createSelectionGroup({
  mode: "single",
  contextName: "RadioGroup",
  ItemComponent: Radio,
  emptyErrorMsg: "Please select an item",
});

export const RadioGroup = Group as unknown as RadioGroupComponent;
