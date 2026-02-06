import { type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { IconCheck } from "@tabler/icons-solidjs";
import { createPropSignal } from "../../../utils/createPropSignal";
import { ripple } from "../../../directives/ripple";
import { Icon } from "../../display/Icon";
import {
  type CheckBoxTheme,
  type CheckBoxSize,
  checkBoxBaseClass,
  indicatorBaseClass,
  themeCheckedClasses,
  checkBoxSizeClasses,
  checkBoxInsetClass,
  checkBoxInlineClass,
  checkBoxDisabledClass,
} from "./CheckBox.styles";

// Directive 사용 선언 (TypeScript용)
void ripple;

export interface CheckBoxProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: CheckBoxSize;
  theme?: CheckBoxTheme;
  inset?: boolean;
  inline?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export const CheckBox: ParentComponent<CheckBoxProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "disabled",
    "size",
    "theme",
    "inset",
    "inline",
    "class",
    "style",
    "children",
  ]);

  const [value, setValue] = createPropSignal({
    value: () => local.value ?? false,
    onChange: () => local.onValueChange,
  });

  const handleClick = () => {
    if (local.disabled) return;
    setValue((v) => !v);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const getWrapperClass = () =>
    twMerge(
      checkBoxBaseClass,
      local.size && checkBoxSizeClasses[local.size],
      local.inset && checkBoxInsetClass,
      local.inline && checkBoxInlineClass,
      local.disabled && checkBoxDisabledClass,
      local.class,
    );

  const getIndicatorClass = () => {
    const theme = local.theme ?? "primary";

    return twMerge(
      indicatorBaseClass,
      "rounded-sm",
      value() && themeCheckedClasses[theme],
    );
  };

  return (
    <label
      {...rest}
      use:ripple={!local.disabled}
      role="checkbox"
      aria-checked={value()}
      tabIndex={local.disabled ? -1 : 0}
      class={getWrapperClass()}
      style={local.style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div class={getIndicatorClass()}>
        <Show when={value()}>
          <Icon icon={IconCheck} size="1em" />
        </Show>
      </div>
      <Show when={local.children}>
        <span>{local.children}</span>
      </Show>
    </label>
  );
};
