import { type JSX, type ParentComponent } from "solid-js";
import type { CheckboxSize } from "./Checkbox.styles";
import { SelectableBase } from "./SelectableBase";

export interface RadioProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inset?: boolean;
  inline?: boolean;
  required?: boolean;
  validate?: (checked: boolean) => string | undefined;
  lazyValidation?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export const Radio: ParentComponent<RadioProps> = (props) => (
  <SelectableBase
    {...props}
    config={{
      role: "radio",
      indicatorShape: "rounded-full",
      indicatorContent: <div class="size-2 rounded-full bg-current" />,
      onToggle: () => true,
    }}
  />
);
