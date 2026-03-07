import { type JSX, type ParentComponent, Show, splitProps, createMemo } from "solid-js";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { ripple } from "../../../directives/ripple";
import { useI18n } from "../../../providers/i18n/I18nProvider";
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

export interface SelectableBaseConfig {
  role: "checkbox" | "radio";
  indicatorShape: string;
  indicatorContent: JSX.Element;
  onToggle: (current: boolean) => boolean;
}

export const SelectableBase: ParentComponent<SelectableBaseProps & { config: SelectableBaseConfig }> = (props) => {
  const [local, rest] = splitProps(props, [
    "checked",
    "onCheckedChange",
    "disabled",
    "size",
    "inset",
    "inline",
    "required",
    "validate",
    "lazyValidation",
    "class",
    "style",
    "children",
    "config",
  ]);

  const i18n = useI18n();

  const [checked, setChecked] = createControllableSignal({
    value: () => local.checked ?? false,
    onChange: () => local.onCheckedChange,
  });

  const handleClick = () => {
    if (local.disabled) return;
    setChecked((v) => local.config.onToggle(v));
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
    twMerge(indicatorBaseClass, local.config.indicatorShape, checked() && checkedClass);

  const errorMsg = createMemo(() => {
    const v = local.checked ?? false;
    if (local.required && !v) return i18n.t("validation.requiredSelection");
    return local.validate?.(v);
  });

  return (
    <Invalid message={errorMsg()} variant="border" lazyValidation={local.lazyValidation}>
      <div
        {...rest}
        use:ripple={!local.disabled}
        role={local.config.role}
        aria-checked={checked()}
        tabIndex={local.disabled ? -1 : 0}
        class={getWrapperClass()}
        style={local.style}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div class={getIndicatorClass()}>
          <Show when={checked()}>
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
