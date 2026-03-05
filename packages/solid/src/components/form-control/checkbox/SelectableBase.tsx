import { type JSX, type ParentComponent, Show, splitProps, createMemo } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { ripple } from "../../../directives/ripple";
import { useI18n } from "../../../providers/i18n/I18nContext";
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
import { Invalid } from "../Invalid";

void ripple;

export interface SelectableBaseProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  size?: CheckboxSize;
  inset?: boolean;
  inline?: boolean;
  required?: boolean;
  validate?: (value: boolean) => string | undefined;
  touchMode?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export interface SelectableBaseConfig {
  role: "checkbox" | "radio";
  indicatorShape: string;
  indicatorContent: JSX.Element;
  onToggle: (current: boolean) => boolean;
}

export const SelectableBase: ParentComponent<SelectableBaseProps & { config: SelectableBaseConfig }> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "disabled",
    "size",
    "inset",
    "inline",
    "required",
    "validate",
    "touchMode",
    "class",
    "style",
    "children",
    "config",
  ]);

  const i18n = useI18n();

  const [value, setValue] = createControllableSignal({
    value: () => local.value ?? false,
    onChange: () => local.onValueChange,
  });

  const handleClick = () => {
    if (local.disabled) return;
    setValue((v) => local.config.onToggle(v));
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
      checkboxSizeClasses[local.size ?? "default"],
      local.inset && checkboxInsetClass,
      local.inset && checkboxInsetSizeHeightClasses[local.size ?? "default"],
      local.inline && checkboxInlineClass,
      local.disabled && checkboxDisabledClass,
      local.class,
    );

  const getIndicatorClass = () =>
    twMerge(indicatorBaseClass, local.config.indicatorShape, value() && checkedClass);

  const errorMsg = createMemo(() => {
    const v = local.value ?? false;
    if (local.required && !v) return i18n.t("validation.requiredSelection");
    return local.validate?.(v);
  });

  return (
    <Invalid message={errorMsg()} variant="border" touchMode={local.touchMode}>
      <div
        {...rest}
        use:ripple={!local.disabled}
        role={local.config.role}
        aria-checked={value()}
        tabIndex={local.disabled ? -1 : 0}
        class={getWrapperClass()}
        style={local.style}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div class={getIndicatorClass()}>
          <Show when={value()}>
            {local.config.indicatorContent}
          </Show>
        </div>
        <Show when={local.children}>
          <span>{local.children}</span>
        </Show>
      </div>
    </Invalid>
  );
};
