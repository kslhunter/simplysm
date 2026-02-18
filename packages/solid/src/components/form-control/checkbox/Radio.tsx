import { type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { ripple } from "../../../directives/ripple";
import clsx from "clsx";
import {
  type CheckboxSize,
  checkboxBaseClass,
  indicatorBaseClass,
  checkedClass,
  checkboxSizeClasses,
  checkboxInsetClass,
  checkboxInsetSizeHeightClasses,
  checkboxInlineClass,
  checkboxDisabledClass,
} from "./Checkbox.styles";

const radioDotClass = clsx("size-2", "rounded-full", "bg-current");

// Directive 사용 선언 (TypeScript용)
void ripple;

export interface RadioProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inset?: boolean;
  inline?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export const Radio: ParentComponent<RadioProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "disabled",
    "size",
    "inset",
    "inline",
    "class",
    "style",
    "children",
  ]);

  const [value, setValue] = createControllableSignal({
    value: () => local.value ?? false,
    onChange: () => local.onValueChange,
  });

  const handleClick = () => {
    if (local.disabled) return;
    setValue(true);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const getWrapperClass = () =>
    twMerge(
      checkboxBaseClass,
      local.size && checkboxSizeClasses[local.size],
      local.inset && checkboxInsetClass,
      local.inset && local.size && checkboxInsetSizeHeightClasses[local.size],
      local.inline && checkboxInlineClass,
      local.disabled && checkboxDisabledClass,
      local.class,
    );

  const getIndicatorClass = () =>
    twMerge(indicatorBaseClass, "rounded-full", value() && checkedClass);

  return (
    <label
      {...rest}
      use:ripple={!local.disabled}
      role="radio"
      aria-checked={value()}
      tabIndex={local.disabled ? -1 : 0}
      class={getWrapperClass()}
      style={local.style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div class={getIndicatorClass()}>
        <Show when={value()}>
          <div class={radioDotClass} />
        </Show>
      </div>
      <Show when={local.children}>
        <span>{local.children}</span>
      </Show>
    </label>
  );
};
