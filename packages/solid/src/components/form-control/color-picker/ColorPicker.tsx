import { type Component, createMemo, type JSX, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { Invalid } from "../Invalid";
import { type ComponentSize } from "../../../styles/tokens.styles";

// Base style
const baseClass = clsx(
  "size-field",
  "rounded",
  "border border-black/10 dark:border-white/10",
  "cursor-pointer",
  // Remove color input default styles
  "[&::-webkit-color-swatch-wrapper]:p-0",
  "[&::-webkit-color-swatch]:border-none",
  "[&::-webkit-color-swatch]:rounded-none",
  "[&::-moz-color-swatch]:border-none",
  "[&::-moz-color-swatch]:rounded-none",
);

// Size-specific styles
const sizeClasses: Record<ComponentSize, string> = {
  xs: "size-field-xs",
  sm: "size-field-sm",
  lg: "size-field-lg",
  xl: "size-field-xl",
};

// Disabled style - shown as diagonal stripes
// eslint-disable-next-line tailwindcss/enforces-shorthand
const disabledClass = clsx(
  "cursor-default",
  "relative",
  "before:absolute before:bottom-0 before:left-0 before:right-0 before:top-0",
  "before:bg-[linear-gradient(45deg,transparent_40%,rgba(0,0,0,0.4)_40%,rgba(0,0,0,0.4)_60%,transparent_60%)]",
);

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

  /** touchMode: show errors only after blur */
  touchMode?: boolean;

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
    "touchMode",
    "class",
    "style",
  ]);

  const [value, setValue] = createControllableSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    setValue(e.currentTarget.value);
  };

  const getClassName = () =>
    twMerge(
      baseClass,
      local.size && sizeClasses[local.size],
      local.disabled && disabledClass,
      local.class,
    );

  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && (v === undefined || v === "")) return "This field is required";
    return local.validate?.(v);
  });

  return (
    <Invalid
      variant={local.inset ? "dot" : "border"}
      message={errorMsg()}
      touchMode={local.touchMode}
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
