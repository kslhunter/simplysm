import { type Component, createMemo, type JSX, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { Invalid } from "../Invalid";
import { type ComponentSize } from "../../../styles/control.styles";
import { useI18n } from "../../../providers/i18n/I18nProvider";

// Size-specific styles
const sizeClasses: Record<ComponentSize, string> = {
  default: clsx`size-field`,
  xs: "size-field-xs",
  sm: "size-field-sm",
  lg: "size-field-lg",
  xl: "size-field-xl",
};

export interface ColorPickerProps {
  /** Color value (#RRGGBB format) */
  value?: string;

  /** Value change callback */
  onValueChange?: (value: string | undefined) => void;

  /** Title (tooltip) */
  title?: string;

  /** Disable input */
  disabled?: boolean;

  /** Size */
  size?: ComponentSize;

  /** inset mode (e.g., inside DataSheet cell) */
  inset?: boolean;

  /** Required input */
  required?: boolean;

  /** Custom validation function */
  validate?: (value: string | undefined) => string | undefined;

  /** lazyValidation: show errors only after blur */
  lazyValidation?: boolean;

  /** Custom class */
  class?: string;

  /** Custom style */
  style?: JSX.CSSProperties;
}

/**
 * ColorPicker component
 *
 * @example
 * ```tsx
 * <ColorPicker value={color()} onValueChange={setColor} />
 * ```
 */
export const ColorPicker: Component<ColorPickerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "title",
    "disabled",
    "size",
    "inset",
    "required",
    "validate",
    "lazyValidation",
    "class",
    "style",
  ]);

  const i18n = useI18n();

  const [value, setValue] = createControllableSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    setValue(e.currentTarget.value);
  };

  const getClassName = () =>
    twMerge(
       
      "size-field rounded border border-black/10 dark:border-white/10 cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-none [&::-moz-color-swatch]:border-none [&::-moz-color-swatch]:rounded-none",
      sizeClasses[local.size ?? "default"],
       
      local.disabled && "cursor-default relative before:absolute before:bottom-0 before:left-0 before:right-0 before:top-0 before:bg-[linear-gradient(45deg,transparent_40%,rgba(0,0,0,0.4)_40%,rgba(0,0,0,0.4)_60%,transparent_60%)]",
      local.class,
    );

  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && (v === undefined || v === "")) return i18n.t("validation.required");
    return local.validate?.(v);
  });

  return (
    <Invalid
      variant={local.inset ? "dot" : "border"}
      message={errorMsg()}
      lazyValidation={local.lazyValidation}
    >
      <input
        {...rest}
        data-color-picker
        type="color"
        class={getClassName()}
        style={local.style}
        value={value() ?? "#000000"}
        title={local.title}
        disabled={local.disabled}
        onInput={handleInput}
      />
    </Invalid>
  );
};
