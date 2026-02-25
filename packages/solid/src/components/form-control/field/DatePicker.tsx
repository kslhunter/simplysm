import clsx from "clsx";
import { type Component, createMemo, type JSX, Show, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { DateOnly } from "@simplysm/core-common";
import { createControllableSignal } from "../../../hooks/createControllableSignal";
import { fieldInputClass, type FieldSize, getFieldWrapperClass } from "./Field.styles";
import { Invalid } from "../../form-control/Invalid";

type DatePickerUnit = "year" | "month" | "date";

export interface DatePickerProps {
  /** Input value */
  value?: DateOnly;

  /** Value change callback */
  onValueChange?: (value: DateOnly | undefined) => void;

  /** Date unit */
  unit?: DatePickerUnit;

  /** Minimum date */
  min?: DateOnly;

  /** Maximum date */
  max?: DateOnly;

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

  /** Custom validation function */
  validate?: (value: DateOnly | undefined) => string | undefined;

  /** touchMode: show errors only after blur */
  touchMode?: boolean;
}

/**
 * Convert DateOnly value to format string matching type
 */
function formatDateValue(value: DateOnly | undefined, type: DatePickerUnit): string | undefined {
  if (value == null) return undefined;

  switch (type) {
    case "year":
      return value.toFormatString("yyyy");
    case "month":
      return value.toFormatString("yyyy-MM");
    case "date":
      return value.toFormatString("yyyy-MM-dd");
  }
}

/**
 * Convert input string to DateOnly
 */
function parseValue(str: string, type: DatePickerUnit): DateOnly | undefined {
  if (str === "") return undefined;

  switch (type) {
    case "year": {
      const year = Number(str);
      if (Number.isNaN(year)) return undefined;
      return new DateOnly(year, 1, 1);
    }
    case "month": {
      // yyyy-MM format
      const match = /^(\d{4})-(\d{2})$/.exec(str);
      if (match == null) return undefined;
      return new DateOnly(Number(match[1]), Number(match[2]), 1);
    }
    case "date": {
      // yyyy-MM-dd format
      return DateOnly.parse(str);
    }
  }
}

/**
 * Determine HTML input type attribute
 */
function getInputType(type: DatePickerUnit): string {
  switch (type) {
    case "year":
      return "number";
    case "month":
      return "month";
    case "date":
      return "date";
  }
}

/**
 * DatePicker component
 *
 * Date input field supporting year, month, and date units.
 * Handles string ↔ DateOnly type conversion internally.
 *
 * @example
 * ```tsx
 * // Date input
 * <DatePicker unit="date" value={date()} onValueChange={setDate} />
 *
 * // Year only
 * <DatePicker unit="year" value={yearDate()} onValueChange={setYearDate} />
 *
 * // Year-month input
 * <DatePicker unit="month" value={monthDate()} onValueChange={setMonthDate} />
 *
 * // With min/max constraints
 * <DatePicker
 *   unit="date"
 *   value={date()}
 *   min={new DateOnly(2025, 1, 1)}
 *   max={new DateOnly(2025, 12, 31)}
 * />
 * ```
 */
export const DatePicker: Component<DatePickerProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "unit",
    "min",
    "max",
    "title",
    "disabled",
    "readonly",
    "size",
    "inset",
    "class",
    "style",
    "required",
    "validate",
    "touchMode",
  ]);

  // Default unit is date
  const fieldType = () => local.unit ?? "date";

  // Support controlled/uncontrolled pattern
  const [value, setValue] = createControllableSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  // Display value
  const displayValue = () => formatDateValue(value(), fieldType()) ?? "";

  // Change handler (on blur or Enter)
  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (e) => {
    const newValue = e.currentTarget.value;
    const parsed = parseValue(newValue, fieldType());
    setValue(parsed);
  };

  // Wrapper class (includeCustomClass: whether to include external class)
  const getWrapperClass = (includeCustomClass: boolean) =>
    getFieldWrapperClass({
      size: local.size,
      disabled: local.disabled,
      inset: local.inset,
      includeCustomClass: includeCustomClass && local.class,
      extra: "min-w-32",
    });

  // Editable check
  const isEditable = () => !local.disabled && !local.readonly;

  // Validation message (check in order, return first error)
  const errorMsg = createMemo(() => {
    const v = value();
    if (local.required && v === undefined) return "This field is required";
    if (v !== undefined) {
      if (local.min !== undefined && v.tick < local.min.tick)
        return `Must be greater than or equal to ${local.min}`;
      if (local.max !== undefined && v.tick > local.max.tick)
        return `Must be less than or equal to ${local.max}`;
    }
    return local.validate?.(v);
  });

  return (
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
                data-date-field
                class={twMerge(getWrapperClass(true), "sd-date-field")}
                style={local.style}
                title={local.title}
              >
                {displayValue() || "\u00A0"}
              </div>
            }
          >
            <div {...rest} data-date-field class={getWrapperClass(true)} style={local.style}>
              <input
                type={getInputType(fieldType())}
                class={fieldInputClass}
                value={displayValue()}
                title={local.title}
                min={formatDateValue(local.min, fieldType())}
                max={formatDateValue(local.max, fieldType())}
                autocomplete="one-time-code"
                onChange={handleChange}
              />
            </div>
          </Show>
        }
      >
        {/* inset mode: dual-element overlay pattern */}
        <div {...rest} data-date-field class={clsx("relative", local.class)} style={local.style}>
          <div
            data-date-field-content
            class={getWrapperClass(false)}
            style={{ visibility: isEditable() ? "hidden" : undefined }}
            title={local.title}
          >
            {displayValue() || "\u00A0"}
          </div>

          <Show when={isEditable()}>
            <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
              <input
                type={getInputType(fieldType())}
                class={fieldInputClass}
                value={displayValue()}
                title={local.title}
                min={formatDateValue(local.min, fieldType())}
                max={formatDateValue(local.max, fieldType())}
                autocomplete="one-time-code"
                onChange={handleChange}
              />
            </div>
          </Show>
        </div>
      </Show>
    </Invalid>
  );
};
