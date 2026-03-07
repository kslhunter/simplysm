import { type JSX, type ParentComponent } from "solid-js";
import { IconCheck } from "@tabler/icons-solidjs";
import type { CheckboxSize } from "./Checkbox.styles";
import { Icon } from "../../display/Icon";
import { SelectableBase } from "./SelectableBase";

export interface CheckboxProps {
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

export const Checkbox: ParentComponent<CheckboxProps> = (props) => (
  <SelectableBase
    {...props}
    config={{
      role: "checkbox",
      indicatorShape: "rounded-sm",
      indicatorContent: <Icon icon={IconCheck} size="1em" />,
      onToggle: (v) => !v,
    }}
  />
);
