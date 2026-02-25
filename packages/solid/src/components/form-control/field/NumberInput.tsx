import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { createSlotComponent } from "../../../helpers/createSlotComponent";
import { createSlotSignal, type SlotAccessor } from "../../../hooks/createSlotSignal";
import {
  type FieldSize,
  fieldInputClass,
  fieldGapClasses,
  getFieldWrapperClass,
} from "./Field.styles";
import { PlaceholderFallback } from "./FieldPlaceholder";
import { Invalid } from "../../form-control/Invalid";

// NumberInput-specific input style (right-aligned + spinner hidden)
const numberInputClass = clsx(
  fieldInputClass,
  "text-right",
  "[&::-webkit-outer-spin-button]:appearance-none",
  "[&::-webkit-inner-spin-button]:appearance-none",
);

interface NumberInputSlotsContextValue {
  setPrefix: (content: SlotAccessor) => void;
}

const NumberInputSlotsContext = createContext<NumberInputSlotsContextValue>();

const NumberInputPrefix = createSlotComponent(NumberInputSlotsContext, (ctx) => ctx.setPrefix);

export interface NumberInputProps {
  /** Input value */
  value?: number;

  /** Value change callback */
  onValueChange?: (value: number | undefined) => void;

  /** Display thousand separator (default: true) */
  comma?: boolean;

  /** Minimum decimal places */
  minDigits?: number;

  /** Placeholder text */
  placeholder?: string;

  /** Title (tooltip) */
  title?: string;

  /** Disable input */
  disabled?: boolean;

  /** Read-only */
  readonly?: boolean;

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

  /** touchMode: show errors only after blur */
  touchMode?: boolean;

  /** Children (Prefix slot, etc.) */
  children?: JSX.Element;
}

/**
 * Convert number to display string
 * @param value - Numeric value
 * @param useComma - Whether to use thousand separator
 * @param minDigits - Minimum decimal places
 * @returns Display string
 */
function formatNumber(value: number | undefined, useComma: boolean, minDigits?: number): string {
  if (value == null) return "";

  let result: string;

  if (minDigits != null && minDigits > 0) {
    // Check current decimal places
    const valueStr = String(value);
    const decimalIndex = valueStr.indexOf(".");
    const currentDigits = decimalIndex >= 0 ? valueStr.length - decimalIndex - 1 : 0;

    // Pad if less than minimum decimal places
    if (currentDigits < minDigits) {
      result = value.toFixed(minDigits);
    } else {
      result = valueStr;
    }
  } else {
    result = String(value);
  }

  if (useComma) {
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
 * <NumberInput value={num()} comma={false} />
 *
 * // Specify minimum decimal places
 * <NumberInput value={price()} minDigits={2} />
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
    "comma",
    "minDigits",
    "placeholder",
    "title",
    "disabled",
    "readonly",
    "size",
    "inset",
    "required",
    "min",
    "max",
    "validate",
    "touchMode",
    "class",
    "style",
    "children",
  ]);

  // Internal string state to track editing state
  const [inputStr, setInputStr] = createSignal<string>("");
  const [isEditing, setIsEditing] = createSignal(false);

  // Support controlled/uncontrolled pattern
  const [value, setValue] = createControllableSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  const [prefix, setPrefix] = createSlotSignal();
  const prefixEl = () => prefix() !== undefined;

  // Sync input string when external value changes
  createEffect(() => {
    const val = value();
    if (!isEditing()) {
      setInputStr(formatNumber(val, local.comma ?? true, local.minDigits));
    }
  });

  // Compute display value
  const displayValue = () => {
    if (isEditing()) {
      return inputStr();
    }
    return formatNumber(value(), local.comma ?? true, local.minDigits);
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
    setInputStr(formatNumber(value(), local.comma ?? true, local.minDigits));
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

  const isEditable = () => !local.disabled && !local.readonly;

  // Validation message (check in order, return first error)
  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && v === undefined) return "This field is required";
    if (v !== undefined) {
      if (local.min !== undefined && v < local.min) return `Minimum value is ${local.min}`;
      if (local.max !== undefined && v > local.max) return `Maximum value is ${local.max}`;
    }
    return local.validate?.(v);
  });

  return (
    <NumberInputSlotsContext.Provider value={{ setPrefix }}>
      {local.children}
      <Invalid
        message={errorMsg()}
        variant={local.inset ? "dot" : "border"}
        touchMode={local.touchMode}
      >
        <Show
          when={local.inset}
          fallback={
            // standalone 모드: 기존 Show 패턴 유지
            <Show
              when={isEditable()}
              fallback={
                <div
                  {...rest}
                  data-number-field
                  class={twMerge(getWrapperClass(true), "sd-number-field", "justify-end")}
                  style={local.style}
                  title={local.title}
                >
                  <Show when={prefix()}>
                    <span class="shrink-0">{prefix()!()}</span>
                  </Show>
                  <PlaceholderFallback
                    value={formatNumber(value(), local.comma ?? true, local.minDigits)}
                    placeholder={local.placeholder}
                  />
                </div>
              }
            >
              <div {...rest} data-number-field class={getWrapperClass(true)} style={local.style}>
                <Show when={prefix()}>
                  <span class="shrink-0">{prefix()!()}</span>
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
              </div>
            </Show>
          }
        >
          {/* inset mode: dual-element overlay pattern */}
          <div
            {...rest}
            data-number-field
            class={clsx("relative", local.class)}
            style={local.style}
          >
            <div
              data-number-field-content
              class={twMerge(getWrapperClass(false), "justify-end")}
              style={{ visibility: isEditable() ? "hidden" : undefined }}
              title={local.title}
            >
              <Show when={prefix()}>
                <span class="shrink-0">{prefix()!()}</span>
              </Show>
              <PlaceholderFallback
                value={formatNumber(value(), local.comma ?? true, local.minDigits)}
                placeholder={local.placeholder}
              />
            </div>

            <Show when={isEditable()}>
              <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
                <Show when={prefix()}>
                  <span class="shrink-0">{prefix()!()}</span>
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
              </div>
            </Show>
          </div>
        </Show>
      </Invalid>
    </NumberInputSlotsContext.Provider>
  );
};

NumberInput.Prefix = NumberInputPrefix;
