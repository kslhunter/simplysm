import {
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  Show,
  splitProps,
} from "solid-js";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createSlot } from "../../../helpers/createSlot";
import {
  type FieldSize,
  fieldInputClass,
  fieldGapClasses,
  getFieldWrapperClass,
} from "./Field.styles";
import { PlaceholderFallback } from "./FieldPlaceholder";
import { useI18n } from "../../../providers/i18n/I18nProvider";
import { FieldShell } from "./FieldShell";
import clsx from "clsx";

// NumberInput-specific input style (right-aligned + spinner hidden)
const numberInputClass = clsx(
  fieldInputClass,
  "text-right",
  "[&::-webkit-outer-spin-button]:appearance-none",
  "[&::-webkit-inner-spin-button]:appearance-none",
);

const [NumberInputPrefixSlot, createNumberInputPrefixAccessor] = createSlot<{ children: JSX.Element }>();
export const NumberInputPrefix = NumberInputPrefixSlot;

export interface NumberInputProps {
  /** Input value */
  value?: number;

  /** Value change callback */
  onValueChange?: (value: number | undefined) => void;

  /** Display thousand separator (default: true) */
  useGrouping?: boolean;

  /** Minimum decimal places */
  minimumFractionDigits?: number;

  /** Placeholder text */
  placeholder?: string;

  /** Title (tooltip) */
  title?: string;

  /** Disable input */
  disabled?: boolean;

  /** Read-only */
  readOnly?: boolean;

  /** Size */
  size?: FieldSize;

  /** Borderless style */
  inset?: boolean;

  /** Custom class */
  class?: string;

  /** Custom style */
  style?: JSX.CSSProperties;

  /** Required input */
  required?: boolean;

  /** Minimum value */
  min?: number;

  /** Maximum value */
  max?: number;

  /** Custom validation function */
  validate?: (value: number | undefined) => string | undefined;

  /** lazyValidation: show errors only after blur */
  lazyValidation?: boolean;

  /** Children (Prefix slot, etc.) */
  children?: JSX.Element;
}

/**
 * Convert number to display string
 * @param value - Numeric value
 * @param useGrouping - Whether to use thousand separator
 * @param minimumFractionDigits - Minimum decimal places
 * @returns Display string
 */
function formatNumber(value: number | undefined, useGrouping: boolean, minimumFractionDigits?: number): string {
  if (value == null) return "";

  let result: string;

  if (minimumFractionDigits != null && minimumFractionDigits > 0) {
    // Check current decimal places
    const valueStr = String(value);
    const decimalIndex = valueStr.indexOf(".");
    const currentDigits = decimalIndex >= 0 ? valueStr.length - decimalIndex - 1 : 0;

    // Pad if less than minimum decimal places
    if (currentDigits < minimumFractionDigits) {
      result = value.toFixed(minimumFractionDigits);
    } else {
      result = valueStr;
    }
  } else {
    result = String(value);
  }

  if (useGrouping) {
    // Separate integer and decimal parts
    const dotIndex = result.indexOf(".");
    const integerPart = dotIndex >= 0 ? result.slice(0, dotIndex) : result;
    const decimalPart = dotIndex >= 0 ? result.slice(dotIndex + 1) : null;
    // Add comma only to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    result = decimalPart !== null ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  }

  return result;
}

/**
 * Convert display string to number
 * @param str - Display string
 * @returns Numeric value or undefined
 */
function parseNumber(str: string): number | undefined {
  if (str === "" || str === "-") return undefined;

  // Remove commas
  const cleanStr = str.replace(/,/g, "");

  // Attempt number conversion
  const num = Number(cleanStr);

  if (Number.isNaN(num)) return undefined;

  return num;
}

/**
 * Check if input string is valid number format
 * @param str - Input string
 * @returns Whether valid
 */
function isValidNumberInput(str: string): boolean {
  if (str === "" || str === "-" || str === ".") return true;

  // Remove commas
  const cleanStr = str.replace(/,/g, "");

  // Number format pattern (including input-in-progress state)
  // Examples: "123", "123.", "123.45", "-123", "-", "-.123"
  return /^-?\d*\.?\d*$/.test(cleanStr);
}

interface NumberInputComponent {
  (props: NumberInputProps): JSX.Element;
  Prefix: typeof NumberInputPrefix;
}

/**
 * NumberInput component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <NumberInput value={num()} onValueChange={setNum} />
 *
 * // Without thousand separator
 * <NumberInput value={num()} useGrouping={false} />
 *
 * // Specify minimum decimal places
 * <NumberInput value={price()} minimumFractionDigits={2} />
 *
 * // Prefix slot
 * <NumberInput value={price()}>
 *   <NumberInput.Prefix>₩</NumberInput.Prefix>
 * </NumberInput>
 * ```
 */
export const NumberInput: NumberInputComponent = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "useGrouping",
    "minimumFractionDigits",
    "placeholder",
    "title",
    "disabled",
    "readOnly",
    "size",
    "inset",
    "required",
    "min",
    "max",
    "validate",
    "lazyValidation",
    "class",
    "style",
    "children",
  ]);

  const i18n = useI18n();

  // Internal string state to track editing state
  const [inputStr, setInputStr] = createSignal<string>("");
  const [isEditing, setIsEditing] = createSignal(false);

  // Support controlled/uncontrolled pattern
  const [value, setValue] = createControllableSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  const [prefix, PrefixProvider] = createNumberInputPrefixAccessor();
  const prefixEl = () => prefix() !== undefined;

  // Sync input string when external value changes
  createEffect(() => {
    const val = value();
    if (!isEditing()) {
      setInputStr(formatNumber(val, local.useGrouping ?? true, local.minimumFractionDigits));
    }
  });

  // Compute display value
  const displayValue = () => {
    if (isEditing()) {
      return inputStr();
    }
    return formatNumber(value(), local.useGrouping ?? true, local.minimumFractionDigits);
  };

  // Input handler
  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const newValue = e.currentTarget.value;

    // Check if valid number format
    if (!isValidNumberInput(newValue)) {
      // Ignore invalid input and restore previous value
      e.currentTarget.value = inputStr();
      return;
    }

    setInputStr(newValue);
    setIsEditing(true);

    // Convert to number
    const num = parseNumber(newValue);
    setValue(num);
  };

  // Focus handler
  const handleFocus: JSX.FocusEventHandler<HTMLInputElement, FocusEvent> = () => {
    setIsEditing(true);
    // On focus, set value without comma
    const val = value();
    if (val != null) {
      setInputStr(String(val));
    } else {
      setInputStr("");
    }
  };

  // Blur handler
  const handleBlur: JSX.FocusEventHandler<HTMLInputElement, FocusEvent> = () => {
    setIsEditing(false);
    // On blur, apply formatting
    setInputStr(formatNumber(value(), local.useGrouping ?? true, local.minimumFractionDigits));
  };

  // Wrapper class (exclude local.class in inset branch)
  const getWrapperClass = (includeCustomClass: boolean) =>
    getFieldWrapperClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      includeCustomClass: includeCustomClass && local.class,
      extra: prefixEl() && fieldGapClasses[local.size ?? "default"],
    });

  const isEditable = () => !local.disabled && !local.readOnly;

  // Validation message (check in order, return first error)
  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && v === undefined) return i18n.t("validation.required");
    if (v !== undefined) {
      if (local.min !== undefined && v < local.min) return i18n.t("validation.minValue", { min: String(local.min) });
      if (local.max !== undefined && v > local.max) return i18n.t("validation.maxValue", { max: String(local.max) });
    }
    return local.validate?.(v);
  });

  return (
    <PrefixProvider>
      {local.children}
      <FieldShell
        errorMsg={errorMsg()}
        invalidVariant={local.inset ? "dot" : "border"}
        lazyValidation={local.lazyValidation}
        inset={local.inset}
        isEditable={isEditable()}
        wrapperClass={getWrapperClass}
        dataAttr="data-number-field"
        readonlyExtraClass="sd-number-field justify-end"
        sizingExtraClass="justify-end"
        style={local.style}
        title={local.title}
        class={local.class}
        rest={rest}
        displayContent={
          <>
            <Show when={prefix()}>
              <span class="shrink-0">{prefix()!.children}</span>
            </Show>
            <PlaceholderFallback
              value={formatNumber(value(), local.useGrouping ?? true, local.minimumFractionDigits)}
              placeholder={local.placeholder}
            />
          </>
        }
      >
        <Show when={prefix()}>
          <span class="shrink-0">{prefix()!.children}</span>
        </Show>
        <input
          type="text"
          inputmode="numeric"
          class={numberInputClass}
          value={displayValue()}
          placeholder={local.placeholder}
          title={local.title}
          autocomplete="one-time-code"
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </FieldShell>
    </PrefixProvider>
  );
};

NumberInput.Prefix = NumberInputPrefix;
